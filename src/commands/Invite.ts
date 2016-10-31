'use strict';
import { Command, version } from 'yamdbf';
import * as Discord from 'discord.js';
import { User, Message } from 'discord.js';
import Time from '../lib/Time';

export default class Invite extends Command
{
	public constructor(bot)
	{
		super(bot, {
			name: 'invite',
			aliases: [],
			description: 'Bot statistics',
			usage: '<prefix>stats',
			extraHelp: '',
			group: 'base'
		});
	}

	public action(message: Message, args: Array<string | number>, mentions: User[], original: string): any
	{
		message.channel.sendMessage(`You can invite me to your server with this link:\nhttps://discordapp.com/oauth2/authorize?client_id=235221760520224769&scope=bot&permissions=1573252151\n\nAfter adding me to your server, I will send you a DM with instructions to prepare your server for moderation. Thanks for choosing YAMDBF Mod for your server moderation control needs! 👏`);
	}
};
