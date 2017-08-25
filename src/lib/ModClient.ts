import { Client, ListenerUtil, LogLevel } from 'yamdbf';
import { TextChannel, RichEmbed, Message, Guild } from 'discord.js';
import { dmManager } from 'yamdbf-dm-manager';
import { commandUsage } from 'yamdbf-command-usage';
import { ModLoader } from './mod/ModLoader';
const config: any = require('../config.json');
const pkg: any = require('../../package.json');

const { on, once } = ListenerUtil;

export class ModClient extends Client
{
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
			logLevel: LogLevel.ERROR,
			plugins: [
				dmManager(config.DMManager),
				commandUsage(config.commandLog)
			]
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
	}

	/**
	 * Log guild join/leave to guild logging channel
	 */
	@on('guildCreate')
	@on('guildDelete', false)
	private _logGuild(guild: Guild, joined: boolean = true): void
	{
		const logChannel: TextChannel = <TextChannel> this.channels.get(this.config.guilds);
		const embed: RichEmbed = new RichEmbed()
			.setColor(joined ? 8450847 : 13091073)
			.setAuthor(`${guild.name} (${guild.id})`, guild.iconURL)
			.setFooter(joined ? 'Joined guild' : 'Left guild')
			.setTimestamp();

		logChannel.send({ embed });
	}
}
