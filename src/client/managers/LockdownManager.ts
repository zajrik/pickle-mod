import { TextChannel, Collection, PermissionOverwrites } from 'discord.js';
import { KeyedStorage, Providers, Logger, logger, Lang, ResourceLoader } from 'yamdbf';
import { ModClient } from '../../client/ModClient';
import { Timer } from '../../timer/Timer';

const { JSONProvider } = Providers;
const res: ResourceLoader = Lang.createResourceLoader('en_us');

/**
 * Contains methods for managing lockdowns on guild channels
 */
export class LockdownManager
{
	@logger('LockdownManager')
	private readonly _logger: Logger;
	private readonly _storage: KeyedStorage;
	private readonly _client: ModClient;
	private _lockdownCheckTimer: Timer;

	public constructor(client: ModClient)
	{
		this._storage = new KeyedStorage('managers/lockdown', JSONProvider);
		this._client = client;
	}

	/**
	 * Initialize the storage for this manager
	 */
	public async init(): Promise<void>
	{
		await this._storage.init();
		this._lockdownCheckTimer = new Timer(this._client, 'lockdown', 5, async () => this._checkLockdowns());
	}

	/**
	 * Set a lockdown for a channel
	 */
	public async set(channel: TextChannel, duration: int): Promise<void>
	{
		let oldPayload: PermissionOverwrites | LockdownObject | { allow: int, deny: int };
		if (await this.isLockedDown(channel)) oldPayload = await this.getLockdown(channel);
		else oldPayload = channel.permissionOverwrites.get(channel.guild.id) || { allow: 0, deny: 0 };

		const lockdown: LockdownObject = {
			channel: channel.id,
			allow: oldPayload.allow,
			deny: oldPayload.deny,
			expires: Date.now() + duration
		};

		await this._storage.set(channel.id, lockdown);
		await channel.overwritePermissions(
			channel.guild.roles.get(channel.guild.id), { SEND_MESSAGES: false });
	}

	/**
	 * Remove a lockdown from a channel
	 */
	public async remove(channel: TextChannel): Promise<void>
	{
			const guildName: string = channel.guild.name;
			const channelName: string = channel.name;
			const lockdown: LockdownObject = await this._storage.get(channel.id);
			const payload: any = {
				id: channel.guild.id,
				type: 'role',
				allow: lockdown.allow,
				deny: lockdown.deny
			};

			try { await (<any> this._client).rest.methods.setChannelOverwrite(channel, payload); }
			catch
			{
				this._logger.warn(`Failed to remove lockdown in '${guildName}#${channelName}'`);
				try { await channel.guild.owner.send(res('MSG_DM_INVALID_LOCKDOWN', { guildName, channelName })); }
				catch {}
			}
			await this._storage.remove(channel.id);
	}

	/**
	 * Returns whether or not a channel is currently lockded down
	 */
	public async isLockedDown(channel: TextChannel): Promise<boolean>
	{
		return await this._storage.exists(channel.id);
	}

	/**
	 * Get the lockdown object for the channel if it is locked down
	 */
	public async getLockdown(channel: TextChannel): Promise<LockdownObject>
	{
		if (!await this.isLockedDown(channel)) return null;
		return await this._storage.get(channel.id);
	}

	/**
	 * Returns whether or not a lockdown has expired
	 */
	public async isExpired(channel: TextChannel): Promise<boolean>
	{
		if (!await this.isLockedDown(channel)) return null;
		let lockdown: LockdownObject = await this.getLockdown(channel);
		return Date.now() > lockdown.expires;
	}

	/**
	 * Get the remaining duration of a lockdown
	 */
	public async getRemaining(channel: TextChannel): Promise<int>
	{
		if (!await this.isLockedDown(channel)) return null;
		let lockdown: LockdownObject = await this.getLockdown(channel);
		return lockdown.expires - Date.now();
	}

	/**
	 * Get all currently locked down channels
	 */
	public async getLockedChannels(): Promise<Collection<string, TextChannel>>
	{
		const ids: string[] = await this._storage.keys();
		let lockedChannels: Collection<string, TextChannel> = new Collection<string, TextChannel>();
		for (const id of ids) lockedChannels.set(id, <TextChannel> this._client.channels.get(id));
		return lockedChannels;
	}

	/**
	 * Check active lockdowns and remove any that are expired
	 */
	private async _checkLockdowns(): Promise<void>
	{
		for (const [id, channel] of (await this.getLockedChannels()).entries())
		{
			if (!channel)
			{
				await this._storage.remove(id);
				this._logger.warn(`Locked down channel '${id}' no longer exists.`);
				continue;
			}

			const channelText: string = `'#${channel.name}' in '${channel.guild.name}'`;
			if (!await this.isExpired(channel)) continue;
			this._logger.log(`Removing expired lockdown: ${channelText}'`);
			await this.remove(channel);
			try { await channel.send('**The lockdown on this channel has ended.**'); }
			catch { this._logger.warn(`Failed to send lockdown expiry message: ${channelText}`); }
		}
	}
}
