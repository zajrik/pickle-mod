import Time from '../Time';
import Timer from '../timer/Timer';
import TimerCollection from '../timer/TimerCollection';
import ModBot from '../ModBot';
import { LocalStorage } from 'yamdbf';
import { TextChannel, GuildMember, Guild } from 'discord.js';

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

		this.timers.add(new Timer(this._bot, 'mute', 15, this._checkMutes));
		this.timers.add(new Timer(this._bot, 'lockdown', 5, this._checkLockdowns));
	}

	/**
	 * Check active mutes and remove any that are expired
	 */
	private async _checkMutes(): Promise<void>
	{
		const storage: LocalStorage = this._bot.storage;
		storage.queue('activeMutes', async (key: string) =>
		{
			let activeMutes: ActiveMutes = storage.getItem(key);
			if (!activeMutes) return;
			for (let user of Object.keys(activeMutes))
			{
				if (activeMutes[user].length === 0) { delete activeMutes[user]; continue; };
				for (let i: number = 0; i < activeMutes[user].length; i++)
				{
					const mute: MuteObject = activeMutes[user][i];
					const mutedRole: string = this._bot.guildStorages.get(mute.guild).getSetting('mutedrole');
					if (!mutedRole || mute.leftGuild) continue;

					const guild: Guild = this._bot.guilds.get(mute.guild);
					let member: GuildMember;
					try { member = await guild.fetchMember(mute.user); }
					catch (err) { continue; }

					const isMuted: boolean = member.roles.has(mutedRole);
					if (!mute.duration && isMuted) continue;
					else if (!mute.duration || !isMuted) mute.duration = 0;

					if ((mute.duration - (Time.now() - mute.timestamp)) > 1) continue;

					console.log(`Removing expired mute for user '${mute.raw}'`);
					if (isMuted) await member.removeRole(guild.roles.get(mutedRole));
					member.send(`Your mute on ${guild.name} has been lifted. You may now send messages.`);
					activeMutes[user].splice(i--, 1);
				}
			}
			storage.setItem(key, activeMutes);
		});
	}

	/**
	 * Check active lockdowns and remove any that are expired
	 */
	private async _checkLockdowns(): Promise<void>
	{
		const storage: LocalStorage = this._bot.storage;
		storage.queue('activeLockdowns', async (key: string) =>
		{
			const activeLockdowns: ActiveLockdowns = storage.getItem(key);
			if (!activeLockdowns) return;
			for (let id of Object.keys(activeLockdowns))
			{
				const lockdown: LockdownObject = activeLockdowns[id];
				const channel: TextChannel = <TextChannel> this._bot.channels.get(lockdown.channel);
				if ((lockdown.duration - (Time.now() - lockdown.timestamp)) > 1) continue;
				console.log(`Removing expired lockdown for channel '${channel.name}' in guild '${channel.guild.name}'`);
				const payload: any = {
					id: channel.guild.roles.get(channel.guild.id).id,
					type: 'role',
					allow: lockdown.allow,
					deny: lockdown.deny
				};
				await (<any> this._bot).rest.methods.setChannelOverwrite(channel, payload);
				delete activeLockdowns[id];
				channel.send('**The lockdown on this channel has ended.**');
			}
			storage.setItem(key, activeLockdowns);
		});
	}
}
