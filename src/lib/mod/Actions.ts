import ModBot from '../ModBot';
import { GuildStorage, LocalStorage } from 'yamdbf';
import { GuildMember, Guild, User } from 'discord.js';

/**
 * Contains methods for taking moderation action
 */
export default class Actions
{
	private _bot: ModBot;

	public constructor(bot: ModBot)
	{
		this._bot = bot;
	}

	/**
	 * Increment the number of times the given user has
	 * received a given type of formal moderation action
	 */
	public count(user: User, guild: Guild, type: ActionType): void
	{
		this._bot.mod.managers.history.incr(user, guild, type);
	}

	/**
	 * Check the number of past offenses a user has had
	 */
	public checkUserHistory(guild: Guild, user: User): { toString: () => string, color: number, values: number[]}
	{
		let { warn, mute, kick, ban }: MemberHistory = this._bot.mod.managers.history.get(user, guild);
		const values = [warn, mute, kick, ban] = [warn || 0, mute || 0, kick || 0, ban || 0];
		const colors: number[] = [
			8450847,
			10870283,
			13091073,
			14917123,
			16152591,
			16667430,
			16462404
		];
		const colorIndex: number = Math.min(values
			.reduce((a: number, b: number) => a + b), colors.length - 1);

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
		this.count(member.user, guild, 'warn');
		return member;
	}

	/**
	 * Mute a user in a guild
	 */
	public async mute(member: GuildMember, guild: Guild): Promise<GuildMember>
	{
		this.count(member.user, guild, 'mute');
		const storage: GuildStorage = this._bot.guildStorages.get(guild);
		return await member.addRoles([guild.roles.get(storage.getSetting('mutedrole'))]);
	}

	/**
	 * Restart a mute, setting a new duration and timestamp
	 */
	public async setMuteDuration(member: GuildMember, guild: Guild, duration: int): Promise<boolean>
	{
		const storage: LocalStorage = this._bot.storage;
		const user: User = member.user;
		let success: boolean = false;
		let activeMutes: ActiveMutes = storage.getItem('activeMutes') || {};
		if (!activeMutes[user.id]) return success;
		await storage.queue('activeMutes', (key: string) =>
		{
			const activeIndex: int = activeMutes[user.id].findIndex(a => a.guild === guild.id);
			if (activeIndex === -1) return;
			activeMutes[user.id][activeIndex] = {
				raw: `${user.username}#${user.discriminator}`,
				user: user.id,
				guild: guild.id,
				duration: duration,
				timestamp: Date.now()
			};
			storage.setItem(key, activeMutes);
			success = true;
			console.log(`Updated mute for '${user.username}#${user.discriminator}' in ${guild.name}`);
		});
		return success;
	}

	/**
	 * Unmute a user in a guild
	 */
	public async unmute(member: GuildMember, guild: Guild): Promise<GuildMember>
	{
		const storage: GuildStorage = this._bot.guildStorages.get(guild);
		return await member.removeRole(guild.roles.get(storage.getSetting('mutedrole')));
	}

	/**
	 * Kick a user from a guild
	 */
	public async kick(member: GuildMember, guild: Guild): Promise<GuildMember>
	{
		this.count(member.user, guild, 'kick');
		return await member.kick();
	}

	/**
	 * Ban a user from a guild
	 */
	public async ban(user: User, guild: Guild): Promise<GuildMember>
	{
		this.count(user, guild, 'ban');
		return <GuildMember> await guild.ban((<User> user).id || <any> user, 7);
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
	public async softban(user: User, guild: Guild): Promise<User>
	{
		this.count(user, guild, 'kick');
		await guild.ban(user, 7);
		await new Promise((r: any) => setTimeout(r, 5e3));
		return await guild.unban(user.id);
	}
}
