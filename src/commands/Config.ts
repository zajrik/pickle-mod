'use strict';
import { Bot, Command } from 'yamdbf';
import { User, Message } from 'discord.js';

export default class Config extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'config',
			aliases: [],
			description: 'Configure options for the server',
			usage: '<prefix>config <option> [...args]',
			extraHelp: '',
			group: 'mod',
			guildOnly: true,
			argOpts: { stringArgs: false, separator: ' ' },
			permissions: [],
			roles: [],
			ownerOnly: false
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		console.log('Config command called');
	}
}
