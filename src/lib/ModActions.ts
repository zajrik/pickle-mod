'use strict';
import Time from './Time';
import Timer from './timer/Timer';
import ModBot from './ModBot';
import { LocalStorage, GuildStorage } from 'yamdbf';
import { GuildMember, GuildChannel, Guild, Message, User } from 'discord.js';

/**
 * A mute entry in storage
 */
type Mute = {
	raw: string;
	user: string;
	guild: string;
	duration: number;
	timestamp: number;
}

/**
 * Storage entry containing all users with active mutes
 * and their Mute objects representing mutes in each guild
 */
type ActiveMutes = { [id: string]: Mute[] }

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
			channel.overwritePermissions(channel.guild.roles.find('name', 'Muted'), this._mutedOverwrites)
				.catch(console.log);
		});

		this._bot.on('guildCreate', (guild: Guild) =>
		{
			guild.owner.sendMessage(`Hello! I'm here to help you with your server moderation needs! To get started, in a text channel on your server that I would have 'read messages' permissions, execute the command \`?init\`. I'll tell you when I'm done setting up my business on your server. From there, should you choose, you can change my command prefix using \`?setprefix <prefix>\` from within your server.\n\nUse \`?help\` from within a server text channel to see the commands available for server moderation.`);
		});

		// Add timer for auto-removal of expired user mutes
		this._bot.timers.add(new Timer(this._bot, 'mute', 60, async () =>
		{
			const storage: LocalStorage = this._bot.storage;
			storage.nonConcurrentAccess('activeMutes', async (key: string) =>
			{
				let activeMutes: ActiveMutes = storage.getItem(key);
				if (!activeMutes) return;
				for (let user of Object.keys(activeMutes))
				{
					if (activeMutes[user].length === 0) return delete activeMutes[user];
					for (let i = 0; i < activeMutes[user].length; i++)
					{
						const mute: Mute = activeMutes[user][i];
						if (!mute.duration) return;
						if (Time.difference(mute.duration, Time.now() - mute.timestamp).ms > 1) continue;
						console.log(`Removing expired mute for user '${mute.raw}'`);
						const guild: Guild = this._bot.guilds.get(mute.guild);
						const member: GuildMember = guild.members.get(mute.user);
						await member.removeRole(guild.roles.find('name', 'Muted'));
						member.sendMessage(`Your mute on ${guild.name} has expired. You may now send messages.`);
						activeMutes[user].splice(i--, 1);
					}
				}
				storage.setItem(key, activeMutes);
			});
		}));
	}

	/**
	 * Create Muted and Mod roles, mod-logs and ban-appeals channels
	 * and assign the necessary permissions to all channels for the roles
	 */
	public async initGuild(guild: Guild)
	{
		if (!guild.roles.find('name', 'Muted')) await guild.createRole({ name: 'Muted' });
		if (!guild.roles.find('name', 'Mod')) await guild.createRole({ name: 'Mod' });
		if (!guild.channels.find('name', 'mod-logs')) await guild.createChannel('mod-logs', 'text');
		if (!guild.channels.find('name', 'ban-appeals')) await guild.createChannel('ban-appeals', 'text');
		await guild.channels.find('name', 'mod-logs')
			.overwritePermissions(guild.roles.find('name', '@everyone'), { SEND_MESSAGES: false });
		await guild.channels.find('name', 'mod-logs')
			.overwritePermissions(guild.roles.find('name', 'YAMDBF Mod'), { SEND_MESSAGES: true });
		await guild.channels.find('name', 'ban-appeals')
			.overwritePermissions(guild.roles.find('name', '@everyone'), { SEND_MESSAGES: false, READ_MESSAGES: false });
		await guild.channels.find('name', 'ban-appeals')
			.overwritePermissions(guild.roles.find('name', 'Mod'), { SEND_MESSAGES: true, READ_MESSAGES: true });
		await guild.channels.find('name', 'ban-appeals')
			.overwritePermissions(guild.roles.find('name', 'YAMDBF Mod'), { SEND_MESSAGES: true, READ_MESSAGES: true });
		for (let channel of guild.channels.values())
		{
			if (!guild.roles.find('name', 'Muted')) return;
			if (!channel.permissionOverwrites.get(guild.roles.find('name', 'Muted').id)
				&& channel.permissionsFor(this._bot.user).hasPermission('MANAGE_ROLES_OR_PERMISSIONS'))
			{
				console.log(`Setting 'Muted' role permissions in channel: ${channel.guild.name}/${channel.name}`);
				await channel.overwritePermissions(guild.roles.find('name', 'Muted'), this._mutedOverwrites);
			}
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
					duration: number): Message
	{
		const storage: GuildStorage = this._bot.guildStorages.get(guild);
		let caseNum: number = storage.getSetting('cases') || 0;
		caseNum++;
		storage.setSetting('cases', caseNum);
		return guild.channels.find('name', 'mod-logs').sendMessage(``
			+ `**Case ${caseNum} | ${type}**\n`
			+ `\`Member:\` ${user} (${(<User> user).username}#${(<User> user).discriminator})\n`
			+ `${duration ? '\`Length:\` ' + duration + '\n' : ''}` // eslint-disable-line
			+ `\`Reason:\` ${reason}\n`
			+ `\`Issuer:\` ${issuer.username}#${issuer.discriminator}`
		);
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