import { ModClient } from '../ModClient';
import { GuildMember } from 'discord.js';
import Timer from '../timer/Timer';
import Time from '../Time';

/**
 * Contains methods to funnel events through and prevent
 * potential abuse
 */
export default class RateLimiter
{
	private _client: ModClient;
	private _rl: { [guild: string]: { [member: string]: { [type: string]: int } } };
	private _rlTimer: Timer;

	public constructor(client: ModClient)
	{
		this._client = client;
		this._rl = {};
		this._rlTimer = new Timer(this._client, 'memberlog-ratelimit', 5, async () => this._checkMemberLogLimits());
	}

	/**
	 * Determine if a nested object path does not end
	 * abruptly and can have a value assigned to the final
	 * property in the path
	 */
	private _validatePath(obj: object, props: string[]): boolean
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
	private async _checkMemberLogLimits(): Promise<void>
	{
		for (const guild of Object.keys(this._rl))
			for (const member of Object.keys(this._rl[guild]))
				for (const type of ['join', 'leave'])
					if (this._rl[guild][member][type]
						&& Time.difference(this._rl[guild][member][type], Time.now()).ms < 1)
						delete this._rl[guild][member][type];
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
			if (!this._rl[member.guild.id]) this._rl[member.guild.id] = {};
			if (!this._rl[member.guild.id][member.id]) this._rl[member.guild.id][member.id] = {};
			this._rl[member.guild.id][member.id][type] = Time.now() + (5 * 60e3);
			return true;
		}
		if (this._validatePath(this._rl, path)
			&& this._rl[member.guild.id][member.id][type]) return true;
		return false;
	}
}
