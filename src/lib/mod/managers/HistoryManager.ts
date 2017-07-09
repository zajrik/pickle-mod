import { KeyedStorage, Providers } from 'yamdbf';
import { User, Guild } from 'discord.js';
const { JSONProvider } = Providers;

/**
 * Contains methods for managing moderation history
 * for guild members
 */
export class HistoryManager
{
	private _storage: KeyedStorage;
	public constructor()
	{
		this._storage = new KeyedStorage('managers/history', JSONProvider);
	}

	/**
	 * Initialize the storage for this manager
	 */
	public async init(): Promise<void>
	{
		await this._storage.init();
	}

	/**
	 * Get moderation action history for a user within a guild
	 */
	public async get(user: User, guild: Guild): Promise<MemberHistory>
	{
		return <MemberHistory> (await this._storage.get(`${guild.id}.${user.id}`) || {});
	}

	/**
	 * Increment an action type in the moderation action history
	 * for a user within a guild
	 */
	public async incr(user: User, guild: Guild, type: ActionType): Promise<void>
	{
		const key: string = `${guild.id}.${user.id}.${type}`;
		if (await this._storage.exists(key))
		{
			let value: number = await this._storage.get(key);
			await this._storage.set(key, ++value);
		}
		else await this._storage.set(key, 1);
	}

	/**
	 * Clear all moderation action history for a user within
	 * a guild
	 */
	public async clear(user: User, guild: Guild): Promise<void>
	{
		const key: string = `${guild.id}.${user.id}`;
		if (await this._storage.exists(key))
			await this._storage.remove(key);
	}
}
