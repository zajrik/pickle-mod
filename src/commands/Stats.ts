'use strict';
import { Command, version } from 'yamdbf';
import * as Discord from 'discord.js';
import { User, Message } from 'discord.js';
import Time from '../lib/Time';

export default class Stats extends Command
{
	public constructor(bot)
	{
		super(bot, {
			name: 'stats',
			aliases: [],
			description: 'Bot statistics',
			usage: '<prefix>stats',
			extraHelp: '',
			group: 'base'
		});
	}

	public action(message: Message, args: Array<string | number>, mentions: User[], original: string): any
	{
		message.channel.sendMessage(`\`\`\`css\n`
			+ `MODBOT STATISTICS\n`
			+ `• Mem Usage  : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n`
			+ `• Uptime     : ${Time.difference(this.bot.uptime * 2, this.bot.uptime).toString()}\n`
			+ `• Users      : ${this.bot.users.size}\n`
			+ `• Servers    : ${this.bot.guilds.size}\n`
			+ `• Channels   : ${this.bot.channels.size}\n`
			+ `• YAMDBF     : v${version}\n`
			+ `• Discord.js : v${Discord.version}\n`
			+ `\`\`\``);
	}
};
