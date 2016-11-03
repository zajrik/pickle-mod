'use strict';
import { Bot, Command } from 'yamdbf';
import { User, Message } from 'discord.js';
import { inspect } from 'util';

export default class Storage extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'storage',
			aliases: [],
			description: 'Get/set/remove a value in storage',
			usage: '<prefix>storage <get|set|rem> <key> [value]',
			extraHelp: 'Strings must be quoted! Single or double-quote is fine. Treat the value you are setting as if it were a real Javascript value.',
			group: 'base',
			argOpts: { stringArgs: true },
			ownerOnly: true
		});
	}

	public action(message: Message, args: Array<string | number>, mentions: User[], original: string): any
	{
		message.delete();
		const action: string = <string> args[0];
		switch (action)
		{
			case 'get':
				if (!this.bot.storage.exists(<string> args[1]))
					return message.channel.sendMessage(`Item "${args[1]}" does not exist.`)
						.then((res: Message) => res.delete(5000));
				return message.channel.sendCode('js', inspect(this.bot.storage.getItem(<string> args[1])));

			case 'set':
				this.bot.storage.setItem(<string> args[1], JSON.parse(args.slice(2).join(' ').replace(/'/g, '"')));
				return message.channel.sendMessage(
					`Set item "${args[1]}": ${args.slice(2).join(' ')}`)
					.then((res: Message) => res.delete(5000));

			case 'rem':
				if (!this.bot.storage.exists(<string> args[1]))
					return message.channel.sendMessage(`Item "${args[1]}" does not exist.`)
						.then((res: Message) => res.delete(5000));
				this.bot.storage.removeItem(<string> args[1]);
				return message.channel.sendMessage(`Item "${args[1]}" deleted`)
					.then((res: Message) => res.delete(5000));

			default:
				if (!args[0]) return message.channel.sendMessage('You must provide an option and a key')
					.then((res: Message) => res.delete(5000));
		}
	}
};
