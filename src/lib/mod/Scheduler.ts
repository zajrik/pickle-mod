import { LockdownManager } from './managers/LockdownManager';
import { MuteManager } from './managers/MuteManager';
import { ModClient } from '../ModClient';
import { TimerCollection } from '../timer/TimerCollection';
import { Timer } from '../timer/Timer';

/**
 * Handles registering timers for running scheduled
 * moderation tasks
 */
export class Scheduler
{
	private _client: ModClient;
	public timers: TimerCollection;
	public constructor(client: ModClient)
	{
		this._client = client;
		this.timers = new TimerCollection();

		this.timers.add(new Timer(this._client, 'lockdown', 5, async () => this._checkLockdowns()));
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
