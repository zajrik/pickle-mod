import { Client, ListenerUtil, LogLevel } from 'yamdbf';
import { GuildMember, TextChannel, RichEmbed, Message, Guild } from 'discord.js';
// import { DMManager } from 'yamdbf-addon-dm-manager';
import { MentionSpamManager } from './mod/managers/MentionSpamManager';
import RateLimiter from './mod/RateLimiter';
import { ModLoader } from './mod/Loader';
const config: any = require('../config.json');
const pkg: any = require('../../package.json');

const { once } = ListenerUtil;

export class ModClient extends Client
{
	private _memberLogRateLimiter: RateLimiter;
	private _mentionSpamManager: MentionSpamManager;
	// private _dmManager: DMManager;
	public config: any;
	public mod: ModLoader;
	public constructor()
	{
		super({
			name: 'YAMDBF Mod',
			token: config.token,
			owner: config.owner,
			version: pkg.version,
			unknownCommandError: false,
			statusText: 'Obey the law.',
			readyText: 'Ready\u0007',
			commandsDir: './bin/commands',
			ratelimit: '10/1m',
			pause: true,
			logLevel: LogLevel.INFO
		});

		this.config = config;

		this._memberLogRateLimiter = new RateLimiter(this);

		this.on('guildMemberAdd', member => this.logMember(member, true, 8450847));
		this.on('guildMemberRemove', member => this.logMember(member, false, 16039746));
		this.on('guildCreate', guild => this.logGuild(guild, true, 8450847));
		this.on('guildDelete', guild => this.logGuild(guild, false, 13091073));
		this.on('command', (name, args, execTime, message) => this.logCommand(name, args, execTime, message));

		this.once('clientReady', async () =>
		{
			this.mod = new ModLoader(this);
			await this.mod.init();

			this._mentionSpamManager = new MentionSpamManager(this);
			// this._dmManager = new DMManager(this, this.config.DMManager);
		});

		// this.on('blacklistAdd', (user, global) => { if (global) this._dmManager.blacklist(user); });
		// this.on('blacklistRemove', (user, global) => { if (global) this._dmManager.whitelist(user); });
	}

	@once('pause')
	private async _onPause(): Promise<void>
	{
		await this.setDefaultSetting('prefix', '?');
		await this.setDefaultSetting('cases', 0);
		await this.setDefaultSetting('mentionSpam', false);
		this.emit('continue');
	}

	/**
	 * Handle creation and sending of an embed for logging guild member joins/leaves.
	 * Requires a text channel called `member-log` to be created that the bot is allowed
	 * to post to. Won't do anything if the channel does not exist
	 */
	private logMember(member: GuildMember, joined: boolean, color: number): Promise<Message>
	{
		if (!member.guild.channels.exists('name', 'member-log')) return;
		const type: 'join' | 'leave' = joined ? 'join' : 'leave';
		if (this._memberLogRateLimiter.memberLog(member, type)) return;
		const memberLog: TextChannel = <TextChannel> member.guild.channels.find('name', 'member-log');
		const embed: RichEmbed = new RichEmbed()
			.setColor(color)
			.setAuthor(`${member.user.username}#${member.user.discriminator} (${member.id})`, member.user.avatarURL)
			.setFooter(joined ? 'User joined' : 'User left' , '')
			.setTimestamp();
		this._memberLogRateLimiter.memberLog(member, type, true);
		return memberLog.sendEmbed(embed);
	}

	/**
	 * Log command usage to command logging channel
	 */
	private logCommand(name: string, args: any, execTime: number, message: Message): Promise<Message>
	{
		const logChannel: TextChannel = <TextChannel> this.channels.get(this.config.commands);
		const embed: RichEmbed = new RichEmbed()
			.setColor(11854048)
			.setAuthor(`${message.author.username}#${message.author.discriminator} (${message.author.id})`,
				message.author.avatarURL);
		if (message.guild) embed.addField('Guild', message.guild.name, true);
		embed.addField('Exec time', `${execTime.toFixed(2)}ms`, true)
			.addField('Command content', message.content)
			.setFooter(message.channel.type.toUpperCase(), this.user.avatarURL)
			.setTimestamp();
		return logChannel.sendEmbed(embed);
	}

	/**
	 * Log guild join/leave to guild logging channel
	 */
	private logGuild(guild: Guild, joined: boolean, color: number): Promise<Message>
	{
		const logChannel: TextChannel = <TextChannel> this.channels.get(this.config.guilds);
		const embed: RichEmbed = new RichEmbed()
			.setColor(color)
			.setAuthor(`${guild.name} (${guild.id})`, guild.iconURL)
			.setFooter(joined ? 'Joined guild' : 'Left guild')
			.setTimestamp();
		return logChannel.sendEmbed(embed);
	}
}
