import { Client, ListenerUtil, LogLevel } from 'yamdbf';
import { TextChannel, RichEmbed, Message, Guild } from 'discord.js';
// import { DMManager } from 'yamdbf-addon-dm-manager';
import { ModLoader } from './mod/ModLoader';
const config: any = require('../config.json');
const pkg: any = require('../../package.json');

const { on, once } = ListenerUtil;

export class ModClient extends Client
{
	// private _dmManager: DMManager;
	public config: any;
	public mod: ModLoader;
	public constructor()
	{
		super({
			token: config.token,
			owner: config.owner,
			unknownCommandError: false,
			statusText: 'Obey the law.',
			readyText: 'Ready\u0007',
			commandsDir: './bin/commands',
			ratelimit: '10/1m',
			pause: true,
			logLevel: LogLevel.INFO
		});

		this.config = config;
	}

	@once('pause')
	private async _onPause(): Promise<void>
	{
		await this.setDefaultSetting('prefix', '-');
		await this.setDefaultSetting('cases', 0);
		await this.setDefaultSetting('mentionSpam', false);
		await this.setDefaultSetting('mentionSpam:threshold', 6);
		await this.setDefaultSetting('mentionSpam:type', 'kick');
		this.continue();
	}

	@once('clientReady')
	private async _onClientReady(): Promise<void>
	{
		this.mod = new ModLoader(this);
		await this.mod.init();

		// this._dmManager = new DMManager(this, this.config.DMManager);
		// this.on('blacklistAdd', (user, global) => { if (global) this._dmManager.blacklist(user); });
		// this.on('blacklistRemove', (user, global) => { if (global) this._dmManager.whitelist(user); });
	}

	/**
	 * Log command usage to command logging channel
	 */
	@on('command')
	private _logCommand(name: string, args: any, execTime: number, message: Message): Promise<Message>
	{
		const logChannel: TextChannel = <TextChannel> this.channels.get(this.config.commands);
		const embed: RichEmbed = new RichEmbed()
			.setColor(11854048)
			.setAuthor(`${message.author.tag} (${message.author.id})`, message.author.avatarURL);
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
	@on('guildCreate')
	@on('guildDelete', false)
	private _logGuild(guild: Guild, joined: boolean = true): Promise<Message>
	{
		const logChannel: TextChannel = <TextChannel> this.channels.get(this.config.guilds);
		const embed: RichEmbed = new RichEmbed()
			.setColor(joined ? 8450847 : 13091073)
			.setAuthor(`${guild.name} (${guild.id})`, guild.iconURL)
			.setFooter(joined ? 'Joined guild' : 'Left guild')
			.setTimestamp();
		return logChannel.sendEmbed(embed);
	}
}
