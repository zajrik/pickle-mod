import { Bot } from 'yamdbf';
import { GuildMember } from 'discord.js';
import TimerCollection from '../timer/TimerCollection';
import Timer from '../timer/Timer';
import Time from '../Time';
/**
 * Contains methods to funnel events through and prevent
 * potential abuse
 */
export default class RateLimiter
{
	private bot: Bot;
	private rl: { [guild: string]: { [member: string]: { [type: string]: int } } };
	private rlTimers: TimerCollection<string, Timer>;

	public constructor(bot: Bot)
	{
		this.bot = bot;
		this.rl = {};
		this.rlTimers = new TimerCollection();

		this.rlTimers.add(new Timer(this.bot, 'memberlog-ratelimit', 5, async () => this.checkMemberLogLimits()));
	}

	/**
	 * Determine if a nested object path does not end
	 * abruptly and can have a value assigned to the final
	 * property in the path
	 */
	private validatePath(obj: any, props: string[]): boolean
	{
		let prev: any = obj;
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
	 * Handle rate limiting for server member logs,
	 * preventing server spam via join/leave abuse
	 * and return whether or not the GuildMember is
	 * currently ratelimited
	 */
	public memberLog(member: GuildMember, type: 'join' | 'leave', set?: boolean): boolean
	{
		const path: string[] = [member.guild.id, member.id, type];
		if (set)
		{
			if (!this.rl[member.guild.id]) this.rl[member.guild.id] = {};
			if (!this.rl[member.guild.id][member.id]) this.rl[member.guild.id][member.id] = {};
			this.rl[member.guild.id][member.id][type] = Time.now() + (5 * 60e3);
			return true;
		}
		if (this.validatePath(this.rl, path)
			&& this.rl[member.guild.id][member.id][type]) return true;
		return false;
	}

	/**
	 * Check current ratelimits and remove any expired
	 */
	private checkMemberLogLimits(): void
	{
		for (const guild of Object.keys(this.rl))
			for (const member of Object.keys(this.rl[guild]))
				for (const type of ['join', 'leave'])
					if (this.rl[guild][member][type]
						&& Time.difference(this.rl[guild][member][type], Time.now()).ms < 1)
						delete this.rl[guild][member][type];
	}
}
