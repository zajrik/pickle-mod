import { TextChannel, Collection, PermissionOverwrites } from 'discord.js';
import { KeyedStorage, JSONProvider } from 'yamdbf';
import ModBot from '../../ModBot';

/**
 * Contains methods for managing lockdowns on guild channels
 */
export class LockdownManager
{
	private _storage: KeyedStorage;
	private _client: ModBot;
	public constructor(client: ModBot)
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
			let lockdown: LockdownObject = await this._storage.get(channel.id);
			const payload: any = {
				id: channel.guild.id,
				type: 'role',
				allow: lockdown.allow,
				deny: lockdown.deny
			};
			try { await (<any> this._client).rest.methods.setChannelOverwrite(channel, payload); }
			catch (err)
			{
				try
				{
					await channel.guild.owner.send(
						`Due to incorrect server permissions, I am unable to remove a lockdown in your server \`${channel.guild.name}\` for channel \`${channel.name}\`.\n`
						+ `In the future you must make sure I have Manage Roles, Manage Channels, and Send Messages permissions at all times, as well as have my YAMDBF Mod role higher`
						+ `than other roles to ensure this does not happen again.`);
				}
				catch (err) {}
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
}
