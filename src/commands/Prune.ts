'use strict';
import { Bot, Command } from 'yamdbf';
import { User, Message, Collection } from 'discord.js';

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
			group: 'base',
			roles: ['Mod']
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		const quantity: number = <number> args[0];
		const member: User = mentions[0];

		if (!quantity || quantity < 1)
			return message.channel.sendMessage('You must enter a number of messages to prune')
				.then((res: Message) => res.delete(5000));

		if (!member) return message.channel.sendMessage('You must mention a user to prune')
			.then((res: Message) => res.delete(5000));

		const pruning: Message = <Message> await message.channel.sendMessage('Prune operation in progress...');
		const messages: Array<[string, Message]> = (await message.channel.fetchMessages(
			{ limit: 100, before: message.id }))
				.filter((a: Message) => a.author.id === member.id)
				.map((m: Message) => [m.id, m]);
		messages.length = quantity;

		const toDelete: Collection<string, Message> = new Collection<string, Message>(messages);
		toDelete.set(message.id, message);

		message.channel.bulkDelete(toDelete);
		return pruning.delete()
			.then(() => message.channel.sendMessage('Prune operation completed.'))
			.then((res: Message) => res.delete(3000));
	}
}
