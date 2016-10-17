const Command = require('yamdbf').Command;
const YAMDBF = require('yamdbf');
const Discord = require('discord.js');
const Time = require('../lib/Time');

exports.default = class Stats extends Command
{
	constructor(bot)
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

	action(message, args, mentions, original) // eslint-disable-line no-unused-vars
	{
		message.channel.sendMessage(`\`\`\`css\n`
			+ `MODBOT STATISTICS\n`
			+ `• Mem Usage  : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n`
			+ `• Uptime     : ${Time.difference(this.bot.uptime * 2, this.bot.uptime).toString()}\n`
			+ `• Users      : ${this.bot.users.size}\n`
			+ `• Servers    : ${this.bot.guilds.size}\n`
			+ `• Channels   : ${this.bot.channels.size}\n`
			+ `• YAMDBF     : v${YAMDBF.version}\n`
			+ `• Discord.js : v${Discord.version}\n`
			+ `\`\`\``);
	}
};
