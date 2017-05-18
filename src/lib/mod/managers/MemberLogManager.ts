import { GuildMember, Message, TextChannel, RichEmbed } from 'discord.js';
import { Time } from 'yamdbf';
import { ModClient } from '../../ModClient';
import Timer from '../../timer/Timer';

/**
 * Handles logging member join/leave messages in a "#member-log" channel
 * on a server, ratelimiting as necessary to prevent spam
 *
 * TODO: Refactor this to use YAMDBF's RateLimiter stuff because it'll
 * make it all much easier and won't have to be swept on interval
 */
export class MemberLogManager
{
	private _client: ModClient;
	private _rl: { [guild: string]: { [member: string]: { [type: string]: int } } };
	private _rlTimer: Timer;

	public constructor(client: ModClient)
	{
		this._client = client;
		this._rl = {};
		this._rlTimer = new Timer(this._client, 'memberlog-ratelimit', 5, async () => this.sweepMemberLogLimits());
		this._client.on('guildMemberAdd', member => this.logMember(member));
		this._client.on('guildMemberRemove', member => this.logMember(member, false));
	}

	/**
	 * Handle creation and sending of an embed for logging guild member joins/leaves.
	 * Requires a text channel called `member-log` to be created that the bot is allowed
	 * to post to. Won't do anything if the channel does not exist
	 */
	private logMember(member: GuildMember, joined: boolean = true): Promise<Message>
	{
		if (!member.guild.channels.exists('name', 'member-log')) return;
		const type: 'join' | 'leave' = joined ? 'join' : 'leave';
		if (this.canLog(member, type)) return;
		const memberLog: TextChannel = <TextChannel> member.guild.channels.find('name', 'member-log');
		const embed: RichEmbed = new RichEmbed()
			.setColor(joined ? 8450847 : 16039746)
			.setAuthor(`${member.user.username}#${member.user.discriminator} (${member.id})`, member.user.avatarURL)
			.setFooter(joined ? 'User joined' : 'User left' , '')
			.setTimestamp();
		this.handleLog(member, type);
		return memberLog.sendEmbed(embed);
	}

	/**
	 * Determine if a nested object path does not end abruptly and can have
	 * a value assigned to the final property in the path
	 */
	private validatePath(obj: object, props: string[]): boolean
	{
		let prev: { [prop: string]: any } = obj;
		let valid: boolean = false;
		let lastProp: string;
		for (const prop of props)
		{
			lastProp = prop;
			if (prev[prop] !== undefined)
			{
				valid = true;
				prev = prev[prop];
			}
			else
			{
				valid = false;
				break;
			}
		}
		if (lastProp === props[props.length - 1]) valid = true;
		return valid;
	}

	/**
	 * Check current ratelimits and remove any expired
	 */
	private async sweepMemberLogLimits(): Promise<void>
	{
		for (const guild of Object.keys(this._rl))
			for (const member of Object.keys(this._rl[guild]))
				for (const type of ['join', 'leave'])
					if (this._rl[guild][member][type]
						&& Time.difference(this._rl[guild][member][type], Date.now()).ms < 1)
						delete this._rl[guild][member][type];
	}

	/**
	 * Shortcut to check if the member join/leave can be logged
	 */
	private canLog(member: GuildMember, type: 'join' | 'leave'): boolean
	{
		return this.handleLog(member, type, true);
	}

	/**
	 * Handle storing of ratelimits for the given guild member for the given type
	 * of action. Returns whether or not the given guild member is currently
	 * ratelimited. Use the `check` boolean param to check if the member
	 * is ratelimited without updating their ratelimit
	 */
	public handleLog(member: GuildMember, type: 'join' | 'leave', check: boolean = false): boolean
	{
		const path: string[] = [member.guild.id, member.id, type];
		if (!check)
		{
			if (!this._rl[member.guild.id]) this._rl[member.guild.id] = {};
			if (!this._rl[member.guild.id][member.id]) this._rl[member.guild.id][member.id] = {};
			this._rl[member.guild.id][member.id][type] = Date.now() + (5 * 60e3);
			return true;
		}
		if (this.validatePath(this._rl, path)
			&& this._rl[member.guild.id][member.id][type]) return true;
		return false;
	}
}
