import { GuildMember, Guild, User } from 'discord.js';
import { GuildStorage, Logger, logger } from 'yamdbf';
import { ModClient } from '../ModClient';

/**
 * Contains methods for taking moderation action
 */
export class Actions
{
	@logger private readonly logger: Logger;
	private _client: ModClient;
	public constructor(client: ModClient)
	{
		this._client = client;
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
			.reduce((a: int, b: int) => a + b), colors.length - 1);

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
		await this.count(member.user, guild, 'mute');
		const storage: GuildStorage = this._client.storage.guilds.get(guild.id);
		return await member.addRoles([guild.roles.get(await storage.settings.get('mutedrole'))]);
	}

	/**
	 * Restart a mute, setting a new duration and timestamp
	 */
	public async setMuteDuration(member: GuildMember, guild: Guild, duration: int): Promise<void>
	{
		const user: User = member.user;
		await this._client.mod.managers.mute.set(member, duration);
		this.logger.log('Actions', `Updated mute: '${user.tag}' in '${guild.name}'`);
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
		await this.count(member.user, guild, 'kick');
		return await member.kick(reason);
	}

	/**
	 * Ban a user from a guild
	 */
	public async ban(user: User, guild: Guild, reason: string): Promise<GuildMember>
	{
		await this.count(user, guild, 'ban');
		return <GuildMember> await guild.ban(user, { reason: reason, days: 7 });
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
		await this.count(user, guild, 'kick');
		await guild.ban(user, { reason: `Softban: ${reason}`, days: 7 });
		await new Promise((r: any) => setTimeout(r, 5e3));
		return await guild.unban(user.id);
	}
}
