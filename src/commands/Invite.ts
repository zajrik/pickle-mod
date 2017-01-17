'use strict';
import { Bot, Command } from 'yamdbf';
import { User, Message } from 'discord.js';

export default class Invite extends Command<Bot>
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'invite',
			aliases: [],
			description: 'Get an invite url for this bot',
			usage: '<prefix>invite',
			extraHelp: '',
			group: 'base'
		});
	}

	public action(message: Message, args: Array<string | number>, mentions: User[], original: string): void
	{
		message.channel.send(`You can invite me to your server with this link:\n`
			+ `https://discordapp.com/oauth2/authorize?client_id=${this.bot.user.id}&scope=bot&permissions=297888791\n\n`
			+ `Be sure to use the \`guide\` command for information `
			+ `on setting up your server for moderation! The default prefix for commands is \`?\`. `
			+ `You can change this with the \`setprefix\` command.\n\nIf you ever forget the command prefix, `
			+ `just use \`@${this.bot.user.username}#${this.bot.user.discriminator} prefix\`. `
			+ `Thanks for choosing YAMDBF Mod for your server moderation control needs! 👏`);
	}
}
