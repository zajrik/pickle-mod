import { LocalStorage } from 'yamdbf';
import { User, Guild } from 'discord.js';

/**
 * Contains methods for managing moderation history
 * for guild members
 */
export class HistoryManager
{
	private _storage: LocalStorage;
	public constructor()
	{
		this._storage = new LocalStorage('storage/managers/history');
	}

	/**
	 * Get moderation action history for a user within a guild
	 */
	public get(user: User, guild: Guild): MemberHistory
	{
		return <MemberHistory> (this._storage.getItem(`${guild.id}/${user.id}`) || {});
	}

	/**
	 * Increment an action type in the moderation action history
	 * for a user within a guild
	 */
	public incr(user: User, guild: Guild, type: ActionType): void
	{
		if (this._storage.exists(`${guild.id}/${user.id}/${type}`))
			this._storage.incr(`${guild.id}/${user.id}/${type}`);
		else this._storage.setItem(`${guild.id}/${user.id}/${type}`, 1);
	}

	/**
	 * Clear all moderation action history for a user within
	 * a guild
	 */
	public clear(user: User, guild: Guild): void
	{
		if (this._storage.exists(`${guild.id}/${user.id}`))
			this._storage.removeItem(`${guild.id}/${user.id}`);
	}
}
