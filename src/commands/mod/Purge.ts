'use strict';
import { Bot, Command } from 'yamdbf';
import { User, Message, Collection } from 'discord.js';

export default class Purge extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'purge',
			aliases: [],
			description: 'Remove the last given quantity of messages from the channel',
			usage: '<prefix>purge <quantity>',
			extraHelp: 'Can delete up to 100 messages per command call',
			group: 'mod'
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		const quantity: number = <number> args[0];

		if (!quantity || quantity < 1)
			return message.channel.sendMessage('You must enter a number of messages to purge.')
				.then((res: Message) => res.delete(5000));

		const pruning: Message = <Message> await message.channel.sendMessage('Purge operation in progress...');

		let messages: Collection<string, Message>;
		messages = (await message.channel.fetchMessages(
			{ limit: Math.min(quantity, 100), before: message.id }));
		messages.set(message.id, message);

		await message.channel.bulkDelete(messages);
		return pruning.delete()
			.then(() => message.channel.sendMessage('Purge operation completed.'))
			.then((res: Message) => res.delete(3000));
	}
}
