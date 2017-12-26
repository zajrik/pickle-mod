import { GuildMember, Guild, User } from 'discord.js';
import { GuildStorage, Logger, logger, Util } from 'yamdbf';
import { ModClient } from '../client/ModClient';

/**
 * Contains methods for taking moderation action
 */
export class Actions
{
	@logger('Actions')
	private readonly _logger: Logger;
	private readonly _client: ModClient;
	private _actionLocks: { [guild: string]: { [user: string]: boolean } };

	public constructor(client: ModClient)
	{
		this._client = client;
		this._actionLocks = {};
	}

	/**
	 * Set an action lock for a user in a guild
	 */
	public setLock(guild: Guild, user: User): void
	{
		Util.assignNestedValue(this._actionLocks, [guild.id, user.id], true);
	}

	/**
	 * Remove an action lock for a user in a guild
	 */
	public removeLock(guild: Guild, user: User): void
	{
		Util.removeNestedValue(this._actionLocks, [guild.id, user.id]);
	}

	/**
	 * Return whether or not a user has an action lock in a guild
	 */
	public isLocked(guild: Guild, user: User): boolean
	{
		return Util.getNestedValue(this._actionLocks, [guild.id, user.id]);
	}

	/**
	 * Increment the number of times the given user has
	 * received a given type of formal moderation action
	 */
	public async count(user: User, guild: Guild, type: ActionType): Promise<void>
	{
		await this._client.mod.managers.history.incr(user, guild, type);
	}

	/**
	 * Check the number of past offenses a user has had
	 */
	public async checkUserHistory(guild: Guild, user: User): Promise<{ toString: () => string, color: number, values: number[]}>
	{
		let { warn, mute, kick, ban }: MemberHistory = await this._client.mod.managers.history.get(user, guild);
		const values: int[] = [warn, mute, kick, ban] = [warn || 0, mute || 0, kick || 0, ban || 0];
		const colors: int[] =
		[
			8450847,
			10870283,
			13091073,
			14917123,
			16152591,
			16667430,
			16462404
		];
		const colorIndex: int = Math.min(values
			.reduce((a, b) => a + b), colors.length - 1);

		return {
			toString: () => `This user has ${warn} warning${
				warn > 1 || warn === 0 ? 's' : ''}, ${mute} mute${
				mute > 1 || mute === 0 ? 's' : ''}, ${kick} kick${
				kick > 1 || kick === 0 ? 's' : ''}, and ${ban} ban${
				ban > 1 || ban === 0 ? 's' : ''}.`,
			color: colors[colorIndex],
			values: values
		};
	}

	/**
	 * Increment a user's warnings
	 */
	public async warn(member: GuildMember, guild: Guild): Promise<GuildMember>
	{
		await this.count(member.user, guild, 'warn');
		return member;
	}

	/**
	 * Mute a user in a guild
	 */
	public async mute(member: GuildMember, guild: Guild): Promise<GuildMember>
	{
		const storage: GuildStorage = this._client.storage.guilds.get(guild.id);
		await member.addRoles([guild.roles.get(await storage.settings.get('mutedrole'))]);
		await this.count(member.user, guild, 'mute');
		return member;
	}

	/**
	 * Restart a mute, setting a new duration and timestamp
	 */
	public async setMuteDuration(member: GuildMember, guild: Guild, duration: int): Promise<void>
	{
		const user: User = member.user;
		await this._client.mod.managers.mute.set(guild, user.id, duration);
		this._logger.log(`Updated mute: '${user.tag}' in '${guild.name}'`);
	}

	/**
	 * Unmute a user in a guild
	 */
	public async unmute(member: GuildMember, guild: Guild): Promise<GuildMember>
	{
		const storage: GuildStorage = this._client.storage.guilds.get(guild.id);
		return await member.removeRole(guild.roles.get(await storage.settings.get('mutedrole')));
	}

	/**
	 * Kick a user from a guild
	 */
	public async kick(member: GuildMember, guild: Guild, reason: string): Promise<GuildMember>
	{
		try
		{
			await member.kick(reason);
			await this.count(member.user, guild, 'kick');
		}
		catch { return; }
		return member;
	}

	/**
	 * Ban a user from a guild
	 */
	public async ban(user: User, guild: Guild, reason: string): Promise<string | User | GuildMember>
	{
		let toReturn: string | User | GuildMember;
		try
		{
			toReturn = await guild.ban(user, { reason: reason, days: 7 });
			await this.count(user, guild, 'ban');
		}
		catch { return; }
		return toReturn;
	}

	/**
	 * Unban a user from a guild. Requires knowledge of the user's ID
	 */
	public async unban(id: string, guild: Guild): Promise<User>
	{
		return await guild.unban(id);
	}

	/**
	 * Softban a user from a guild, removing the past 7 days of their messages
	 */
	public async softban(user: User, guild: Guild, reason: string): Promise<User>
	{
		let toReturn: User;
		try
		{
			await guild.ban(user, { reason: `Softban: ${reason}`, days: 7 });
			await this.count(user, guild, 'kick');
			await new Promise((r: any) => setTimeout(r, 5e3));
			toReturn = await guild.unban(user.id);
		}
		catch { return; }
		return toReturn;
	}
}
