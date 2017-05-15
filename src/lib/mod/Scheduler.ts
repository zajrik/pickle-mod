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
	private _client: ModBot;
	public timers: TimerCollection;
	public constructor(client: ModBot)
	{
		this._client = client;
		this.timers = new TimerCollection();

		this.timers.add(new Timer(this._client, 'mute', 15, async () => this._checkMutes()));
		this.timers.add(new Timer(this._client, 'lockdown', 5, async () => this._checkLockdowns()));
	}

	/**
	 * Check active mutes and remove any that are expired
	 */
	private async _checkMutes(): Promise<void>
	{
		const muteManager: MuteManager = this._client.mod.managers.mute;
		for (const guild of this._client.guilds.values())
		{
			const mutedRole: string = await this._client.storage.guilds.get(guild.id).settings.get('mutedrole');
			for (const member of (await muteManager.getMutedMembers(guild)).values())
			{
				if (typeof member === 'string') continue;
				if (!await muteManager.isExpired(member)) continue;
				if (await muteManager.isEvasionFlagged(member)) continue;

				console.log(`Removed expired mute: '${member.user.username}#${member.user.discriminator}' in '${guild.name}'`);
				await muteManager.remove(member);
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
		let lockdownManager: LockdownManager = this._client.mod.managers.lockdown;
		for (const channel of (await lockdownManager.getLockedChannels()).values())
		{
			if (!await lockdownManager.isExpired(channel)) continue;
			console.log(`Removing expired lockdown for channel '${channel.name}' in guild '${channel.guild.name}'`);
			await lockdownManager.remove(channel);
			try { await channel.send('**The lockdown on this channel has ended.**'); }
			catch (err) { console.log(`Failed to send lockdown expiry message for channel '${channel.name}' in guild '${channel.guild.name}'`); }
		}
	}
}
