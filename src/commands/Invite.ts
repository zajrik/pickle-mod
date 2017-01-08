'use strict';
import { Bot, Command } from 'yamdbf';
import { User, Message } from 'discord.js';

export default class Invite extends Command
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

	public action(message: Message, args: Array<string | number>, mentions: User[], original: string): any
	{
		message.channel.sendMessage(`You can invite me to your server with this link:\nhttps://discordapp.com/oauth2/authorize?client_id=${this.bot.user.id}&scope=bot&permissions=490826759\n\nAfter adding me to your server, I will send you a DM with instructions to prepare your server for moderation. Thanks for choosing YAMDBF Mod for your server moderation control needs! 👏`);
	}
}
