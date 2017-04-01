import { TextChannel, Collection } from 'discord.js';
import { LocalStorage } from 'yamdbf';
import ModBot from '../../ModBot';

/**
 * Contains methods for managing lockdowns on guild channels
 */
export class LockdownManager
{
	private _storage: LocalStorage;
	private _bot: ModBot;
	public constructor(bot: ModBot)
	{
		this._storage = new LocalStorage('storage/managers/lockdown');
		this._bot = bot;
	}

	/**
	 * Set a lockdown for a channel
	 */
	public async set(channel: TextChannel, duration: int): Promise<void>
	{
		let oldPayload: any;
		if (this.isLockedDown(channel)) oldPayload = this.getLockdown(channel);
		else oldPayload = channel.permissionOverwrites.get(channel.guild.id) || { allow: 0, deny: 0 };
		await this._storage.queue(channel.id, async key =>
		{
			const lockdown: LockdownObject = {
				channel: channel.id,
				allow: oldPayload.allow,
				deny: oldPayload.deny,
				expires: Date.now() + duration
			};
			this._storage.setItem(key, lockdown);
			await channel.overwritePermissions(
				channel.guild.roles.get(channel.guild.id), { SEND_MESSAGES: false });
		});
	}

	/**
	 * Remove a lockdown from a channel
	 */
	public async remove(channel: TextChannel): Promise<void>
	{
		await this._storage.queue(channel.id, async key =>
		{
			let lockdown: LockdownObject = this._storage.getItem(key);
			const payload: any = {
				id: channel.guild.id,
				type: 'role',
				allow: lockdown.allow,
				deny: lockdown.deny
			};
			try { await (<any> this._bot).rest.methods.setChannelOverwrite(channel, payload); }
			catch (err)
			{
				try
				{
					await channel.guild.owner.send(
						`Due to incorrect server permissions, I am unable to remove a lockdown in your server \`${channel.guild.name}\` for channel \`${channel.name}\`.\n`
						+ `In the future you must make sure I have Manage Channels and Send Messages permissions at all times, as well as have my YAMDBF Mod role higher`
						+ `than other roles to ensure this does not happen again.`);
				}
				catch (err) {}
			}
			this._storage.removeItem(key);
		});
	}

	/**
	 * Returns whether or not a channel is currently lockded down
	 */
	public isLockedDown(channel: TextChannel): boolean
	{
		return this._storage.exists(channel.id);
	}

	/**
	 * Get the lockdown object for the channel if it is locked down
	 */
	public getLockdown(channel: TextChannel): LockdownObject
	{
		if (!this.isLockedDown(channel)) return null;
		return this._storage.getItem(channel.id);
	}

	/**
	 * Returns whether or not a lockdown has expired
	 */
	public isExpired(channel: TextChannel): boolean
	{
		if (!this.isLockedDown(channel)) return null;
		let lockdown: LockdownObject = this.getLockdown(channel);
		return Date.now() > lockdown.expires;
	}

	/**
	 * Get the remaining duration of a lockdown
	 */
	public getRemaining(channel: TextChannel): int
	{
		if (!this.isLockedDown(channel)) return null;
		let lockdown: LockdownObject = this.getLockdown(channel);
		return lockdown.expires - Date.now();
	}

	/**
	 * Get all currently locked down channels
	 */
	public getLockedChannels(): Collection<string, TextChannel>
	{
		const ids: string[] = Object.keys(this._storage.getItem('') || {});
		let lockedChannels: Collection<string, TextChannel> = new Collection<string, TextChannel>();
		for (const id of ids) lockedChannels.set(id, <TextChannel> this._bot.channels.get(id));
		return lockedChannels;
	}
}
