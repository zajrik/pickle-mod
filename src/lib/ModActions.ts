'use strict';
import Time from './Time';
import Timer from './timer/Timer';
import ModBot from './ModBot';
import * as moment from 'moment';
import { LocalStorage, GuildStorage } from 'yamdbf';
import { TextChannel, GuildMember, GuildChannel, Guild, Message, User } from 'discord.js';

/**
 * Storage entry containing all users with active mutes
 * and their Mute objects representing mutes in each guild
 */
export type ActiveMutes = { [id: string]: MuteObj[] }

/**
 * A mute entry in storage
 */
export type MuteObj = {
	raw: string;
	user: string;
	guild: string;
	duration: number;
	timestamp: number;
}

/**
 * Storage entry containing all users with active bans
 * and their ban objects representing bans in each guild
 */
export type ActiveBans = { [id: string]: BanObj[] }

/**
 * A ban entry in storage
 */
export type BanObj = {
	user: string;
	raw: string;
	guild: string;
	guildName: string;
	reason: string;
	timestamp: number;
}

/**
 * Storage entry containing all active appeals
 */
export type ActiveAppeals = { [id: string]: string }

/**
 * Storage entry containing all guilds with active lockdowns
 * and their lockdown objects
 */
export type ActiveLockdowns = { [id: string]: LockdownObj }

/**
 * A lockdown entry in storage. Contains information necessary
 * for later removal of the channel lockdown
 */
export type LockdownObj = {
	message: string;
	channel: string;
	allow: number;
	deny: number;
	duration: number;
	timestamp: number;
}

/**
 * Provides controls allowing the bot to execute moderation commands
 * called by users of the appropriate role
 */
export default class ModActions
{
	private _bot: ModBot;
	private _mutedOverwrites: any;

	public constructor(bot: ModBot)
	{
		this._bot = bot;
		this._mutedOverwrites = {
			SEND_MESSAGES: false,
			SEND_TTS_MESSAGES: false,
			EMBED_LINKS: false,
			ATTACH_FILES: false,
			SPEAK: false
		};

		this._bot.on('channelCreate', async (channel: GuildChannel) =>
		{
			if (!channel.guild) return;
			if (channel.type === 'text' && !channel.permissionsFor(this._bot.user)
				.hasPermission('MANAGE_ROLES_OR_PERMISSIONS')) return;
			console.log(`Setting 'Muted' role permissions in channel: ${channel.guild.name}/${channel.name}`);
			await channel.overwritePermissions(channel.guild.roles.find('name', 'Muted'), this._mutedOverwrites)
				.catch(console.log);
			await channel.overwritePermissions(channel.guild.roles.find('name', 'Mod'), <any> { SEND_MESSAGES: true });
			await channel.overwritePermissions(channel.guild.roles.find('name', 'YAMDBF Mod'), <any> { SEND_MESSAGES: true });
		});

		this._bot.on('guildCreate', (guild: Guild) =>
		{
			guild.owner.sendMessage(`Hello! I'm here to help you with your server moderation needs! To get started, in a text channel on your server that I would have 'read messages' permissions, execute the command \`?init\`. I'll tell you when I'm done setting up my business on your server. From there, should you choose, you can change my command prefix using \`?setprefix <prefix>\` from within your server.\n\nUse \`?help\` from within a server text channel to see the commands available for server moderation.`);
		});

		// Add timer for auto-removal of expired user mutes
		this._bot.timers.add(new Timer(this._bot, 'mute', 30, async () =>
		{
			const storage: LocalStorage = this._bot.storage;
			storage.nonConcurrentAccess('activeMutes', async (key: string) =>
			{
				let activeMutes: ActiveMutes = storage.getItem(key);
				if (!activeMutes) return;
				for (let user of Object.keys(activeMutes))
				{
					if (activeMutes[user].length === 0) { delete activeMutes[user]; continue; };
					for (let i: number = 0; i < activeMutes[user].length; i++)
					{
						const mute: MuteObj = activeMutes[user][i];
						const isMuted: boolean = !!(await this._bot.guilds.get(mute.guild)
							.fetchMember(user)).roles.find('name', 'Muted');
						if (!mute.duration && isMuted) continue;
						else if (!mute.duration) mute.duration = 0;
						if (Time.difference(mute.duration, Time.now() - mute.timestamp).ms > 1) continue;
						console.log(`Removing expired mute for user '${mute.raw}'`);
						const guild: Guild = this._bot.guilds.get(mute.guild);
						const member: GuildMember = guild.members.get(mute.user);
						await member.removeRole(guild.roles.find('name', 'Muted'));
						member.sendMessage(`Your mute on ${guild.name} has been lifted. You may now send messages.`);
						activeMutes[user].splice(i--, 1);
					}
				}
				storage.setItem(key, activeMutes);
			});
		}));

		// Add timer for auto-removal of expired channel lockdowns
		this._bot.timers.add(new Timer(this._bot, 'lockdown', 60, async () =>
		{
			const storage: LocalStorage = this._bot.storage;
			storage.nonConcurrentAccess('activeLockdowns', async (key: string) =>
			{
				const activeLockdowns: ActiveLockdowns = storage.getItem(key);
				if (!activeLockdowns) return;
				for (let id of Object.keys(activeLockdowns))
				{
					const lockdown: LockdownObj = activeLockdowns[id];
					const channel: TextChannel = <TextChannel> this._bot.channels.get(lockdown.channel);
					if (Time.difference(lockdown.duration, Time.now() - lockdown.timestamp).ms > 1) continue;
					console.log(`Removing expired lockdown for channel '${channel.name}' in guild '${channel.guild.name}'`);
					const payload: any = {
						id: channel.guild.roles.find('name', '@everyone').id,
						type: 'role',
						allow: lockdown.allow,
						deny: lockdown.deny
					};
					await this._bot.rest.methods.setChannelOverwrite(channel, payload);
					delete activeLockdowns[id];
					channel.fetchMessage(lockdown.message)
						.then((msg: Message) => msg.delete());
					channel.sendMessage('The lockdown on this channel has ended.')
						.then((res: Message) => res.delete(10000));
				}
				storage.setItem(key, activeLockdowns);
			});
		}));
	}

	/**
	 * Create Muted and Mod roles, mod-logs and ban-appeals channels
	 * and assign the necessary permissions to all channels for the roles
	 */
	public async initGuild(guild: Guild): Promise<void>
	{
		if (!guild.roles.find('name', 'Muted')) await guild.createRole({ name: 'Muted' });
		if (!guild.roles.find('name', 'Mod')) await guild.createRole({ name: 'Mod' });
		if (!guild.channels.find('name', 'mod-logs')) await guild.createChannel('mod-logs', 'text');
		if (!guild.channels.find('name', 'ban-appeals')) await guild.createChannel('ban-appeals', 'text');
		await guild.channels.find('name', 'mod-logs')
			.overwritePermissions(guild.roles.find('name', '@everyone'), <any> { SEND_MESSAGES: false });
		await guild.channels.find('name', 'mod-logs')
			.overwritePermissions(guild.roles.find('name', 'YAMDBF Mod'), <any> { SEND_MESSAGES: true });
		await guild.channels.find('name', 'ban-appeals')
			.overwritePermissions(guild.roles.find('name', '@everyone'), <any> { SEND_MESSAGES: false, READ_MESSAGES: false });
		await guild.channels.find('name', 'ban-appeals')
			.overwritePermissions(guild.roles.find('name', 'Mod'), <any> { SEND_MESSAGES: true, READ_MESSAGES: true });
		await guild.channels.find('name', 'ban-appeals')
			.overwritePermissions(guild.roles.find('name', 'YAMDBF Mod'), <any> { SEND_MESSAGES: true, READ_MESSAGES: true });
		for (let channel of guild.channels.values())
		{
			if (!guild.roles.find('name', 'Muted')) return;
			if (!channel.permissionOverwrites.get(guild.roles.find('name', 'Muted').id)
				&& channel.permissionsFor(this._bot.user).hasPermission('MANAGE_ROLES_OR_PERMISSIONS'))
			{
				console.log(`Setting 'Muted' role permissions in channel: ${channel.guild.name}/${channel.name}`);
				await channel.overwritePermissions(guild.roles.find('name', 'Muted'), this._mutedOverwrites);
			}
			await channel.overwritePermissions(guild.roles.find('name', 'YAMDBF Mod'), <any> { SEND_MESSAGES: true });
			if (channel.name === 'mod-logs') return;
			await channel.overwritePermissions(guild.roles.find('name', 'Mod'), <any> { SEND_MESSAGES: true });
		}
	}

	/**
	 * Increment the number of times the given user has
	 * received a given type of formal moderation action
	 */
	private _count(user: User | string,
					guild: Guild | string,
					type: 'warnings' | 'mutes' | 'kicks' | 'bans'): void
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
	 * Post the moderation case to the mod-logs channel
	 */
	public caseLog(user: User | string,
					guild: Guild,
					type: 'Warn' | 'Mute' | 'Kick' | 'Ban',
					reason: string,
					issuer: User,
					duration?: string): Promise<Message>
	{
		const storage: GuildStorage = this._bot.guildStorages.get(guild);
		let caseNum: number = storage.getSetting('cases') || 0;
		caseNum++;
		storage.setSetting('cases', caseNum);

		enum colors
		{
			'Warn' = 16776960,
			'Mute' = 16763904,
			'Kick' = 16745216,
			'Ban' = 16718080
		}

		const embed: any = {
			color: colors[type],
			author: {
				name: `${issuer.username}#${issuer.discriminator}`,
				icon_url: issuer.avatarURL
			},
			description: `**Member:** ${user} (${(<User> user).username}#${(<User> user).discriminator})\n`
				+ `**Action:** ${type}\n`
				+ `${duration ? `**Length:** ${duration}\n` : ''}`
				+ `**Reason:** ${reason}`,
			footer: {
				text: `Case ${caseNum} | ${moment().format('dddd, MMM Do, YYYY | h:mm a')}`
			}
		};

		return (<TextChannel> guild.channels.find('name', 'mod-logs')).sendMessage(``, <any> { embed: embed });
	}

	/**
	 * Give a formal warning to the provided user
	 */
	public warn(user: User | string, guild: Guild): Promise<User | string>
	{
		this._count(user, guild, 'warnings');
		return Promise.resolve(user);
	}

	/**
	 * Mute a user in a guild
	 */
	public mute(user: User | string, guild: Guild): Promise<GuildMember>
	{
		this._count(user, guild, 'mutes');
		const member: GuildMember = guild.members.get((<User> user).id || <string> user);
		return member.addRole(guild.roles.find('name', 'Muted'));
	}

	/**
	 * Unmute a user in a guild
	 */
	public unmute(user: User | string, guild: Guild): Promise<GuildMember>
	{
		const member: GuildMember = guild.members.get((<User> user).id || <string> user);
		return member.removeRole(guild.roles.find('name', 'Muted'));
	}

	/**
	 * Kick a user from a guild
	 */
	public kick(user: User | string, guild: Guild): Promise<GuildMember>
	{
		this._count(user, guild, 'kicks');
		const member: GuildMember = guild.members.get((<User> user).id || <string> user);
		return member.kick();
	}

	/**
	 * Ban a user from a guild
	 */
	public ban(user: User | string, guild: Guild): Promise<GuildMember>
	{
		this._count(user, guild, 'bans');
		const member: GuildMember = guild.members.get((<User> user).id || <string> user);
		return guild.ban(member, 7);
	}

	/**
	 * Unban a user from a guild. Requires knowledge of the user's ID
	 */
	public unban(id: string, guild: Guild): Promise<User>
	{
		return guild.unban(id);
	}
}
