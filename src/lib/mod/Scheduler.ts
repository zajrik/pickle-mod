import ModBot from '../ModBot';
import Timer from '../timer/Timer';
import TimerCollection from '../timer/TimerCollection';
import { LockdownManager } from './managers/LockdownManager';
import { MuteManager } from './managers/MuteManager';

/**
 * Handles registering timers for running scheduled
 * moderation tasks
 */
export default class Scheduler
{
	private _bot: ModBot;
	public timers: TimerCollection<string, Timer>;

	public constructor(bot: ModBot)
	{
		this._bot = bot;
		this.timers = new TimerCollection();

		this.timers.add(new Timer(this._bot, 'mute', 15, async () => this._checkMutes()));
		this.timers.add(new Timer(this._bot, 'lockdown', 5, async () => this._checkLockdowns()));
	}

	/**
	 * Check active mutes and remove any that are expired
	 */
	private async _checkMutes(): Promise<void>
	{
		const muteManager: MuteManager = this._bot.mod.managers.mute;
		for (const guild of this._bot.guilds.values())
		{
			const mutedRole: string = this._bot.guildStorages.get(guild).getSetting('mutedrole');
			for (const member of (await muteManager.getMutedMembers(guild)).values())
			{
				if (typeof member === 'string') continue;
				if (!muteManager.isExpired(member)) continue;
				if (muteManager.isEvasionFlagged(member)) continue;

				console.log(`Removed expired mute: '${member.user.username}#${member.user.discriminator}' in '${guild.name}'`);
				muteManager.remove(member);
				if (member.roles.has(mutedRole))
					await member.removeRole(guild.roles.get(mutedRole));
				member.send(`Your mute on ${guild.name} has been lifted. You may now send messages.`);
			}
		}
	}

	/**
	 * Check active lockdowns and remove any that are expired
	 */
	private async _checkLockdowns(): Promise<void>
	{
		let lockdownManager: LockdownManager = this._bot.mod.managers.lockdown;
		for (const channel of lockdownManager.getLockedChannels().values())
		{
			if (!lockdownManager.isExpired(channel)) continue;
			console.log(`Removing expired lockdown for channel '${channel.name}' in guild '${channel.guild.name}'`);
			await lockdownManager.remove(channel);
			channel.send('**The lockdown on this channel has ended.**');
		}
	}
}
