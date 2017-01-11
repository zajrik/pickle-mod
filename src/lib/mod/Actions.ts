import ModBot from '../ModBot';
import { GuildStorage } from 'yamdbf';
import { GuildMember, Guild, User } from 'discord.js';

/**
 * Contains methods for taking moderation action
 */
export default class ModActions
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
	private _count(user: User | string,
					guild: Guild | string,
					type: 'warnings' | 'mutes' | 'kicks' | 'softbans' | 'bans'): void
	{
		const storage: GuildStorage = this._bot.guildStorages.get(<string> guild);
		let counts: any = storage.getItem(type);
		if (!counts)
		{
			counts = {};
			counts[(<User> user).id || <string> user] = 0;
		}
		counts[(<User> user).id || <string> user]++;
		storage.setItem(type, counts);
	}

	/**
	 * Check the number of past offenses a user has had
	 */
	public checkUserHistory(guild: Guild, user: User): { toString: () => string, color: number, values: number[]}
	{
		const storage: GuildStorage = this._bot.guildStorages.get(guild);
		const [warns, mutes, kicks, softbans, bans]: number[] = ['warnings', 'mutes', 'kicks', 'softbans', 'bans']
			.map((type: string) => (storage.getItem(type) || {})[user.id] || 0);
		const values: number[] = [warns, mutes, kicks, softbans, bans];
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
			toString: () => `This user has ${warns} warnings, ${mutes} mutes, ${kicks + softbans} kicks, and ${bans} bans.`,
			color: colors[colorIndex],
			values: values
		};
	}

	/**
	 * Increment a user's warnings
	 */
	public async warn(user: User | string, guild: Guild): Promise<User | string>
	{
		this._count(user, guild, 'warnings');
		return user;
	}

	/**
	 * Mute a user in a guild
	 */
	public async mute(user: User | string, guild: Guild): Promise<GuildMember>
	{
		this._count(user, guild, 'mutes');
		const member: GuildMember = guild.members.get((<User> user).id || <string> user);
		const storage: GuildStorage = this._bot.guildStorages.get(guild);
		return await member.addRole(guild.roles.get(storage.getSetting('mutedrole')));
	}

	/**
	 * Unmute a user in a guild
	 */
	public async unmute(user: User | string, guild: Guild): Promise<GuildMember>
	{
		const member: GuildMember = guild.members.get((<User> user).id || <string> user);
		const storage: GuildStorage = this._bot.guildStorages.get(guild);
		return await member.removeRole(guild.roles.get(storage.getSetting('mutedrole')));
	}

	/**
	 * Kick a user from a guild
	 */
	public async kick(user: User | string, guild: Guild): Promise<GuildMember>
	{
		this._count(user, guild, 'kicks');
		const member: GuildMember = guild.members.get((<User> user).id || <string> user);
		return await member.kick();
	}

	/**
	 * Ban a user from a guild
	 */
	public async ban(user: User | string, guild: Guild): Promise<GuildMember>
	{
		this._count(user, guild, 'bans');
		const member: GuildMember = guild.members.get((<User> user).id || <string> user);
		return <GuildMember> await guild.ban(member, 7);
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
	public async softban(user: User | string, guild: Guild): Promise<User>
	{
		this._count(user, guild, 'softbans');
		const member: GuildMember = guild.members.get((<User> user).id || <string> user);
		await guild.ban(member, 7);
		await new Promise((r: any) => setTimeout(r, 5e3));
		return await guild.unban(member.id);
	}
}
