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
		message.channel.send(`You can invite me to your server with this link:\nhttps://discordapp.com/oauth2/authorize?client_id=${this.bot.user.id}&scope=bot&permissions=297888791\n\nAfter adding me to your server, I will send you a DM with instructions to prepare your server for moderation. Thanks for choosing YAMDBF Mod for your server moderation control needs! 👏`);
	}
}
