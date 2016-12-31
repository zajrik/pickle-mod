'use strict';
import { Bot, Command } from 'yamdbf';
import { User, Message, Collection } from 'discord.js';
import ModBot from '../../lib/ModBot';

export default class Prune extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'prune',
			aliases: [],
			description: 'Remove the last given quantity of messages for the provided member',
			usage: '<prefix>prune <quantity> <member>',
			extraHelp: 'Can delete up to 100 messages per command call',
			group: 'prune',
			guildOnly: true
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!(<ModBot> this.bot).mod.canCallModCommand(message)) return;
		const quantity: number = <number> args[0];
		const member: User = mentions[0];

		if (!quantity || quantity < 1)
			return message.channel.sendMessage('You must enter a number of messages to prune');

		if (!member) return message.channel.sendMessage('You must mention a user to prune');

		const messages: Array<[string, Message]> = (await message.channel.fetchMessages(
			{ limit: 100, before: message.id }))
				.filter((a: Message) => a.author.id === member.id)
				.map((m: Message) => [m.id, m]);
		messages.length = quantity;

		const toDelete: Collection<string, Message> = new Collection<string, Message>(messages);
		toDelete.set(message.id, message);

		await message.channel.bulkDelete(toDelete);
		return message.author.sendMessage('Prune operation completed.');
	}
}
