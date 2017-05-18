import { Command, Message, Middleware, CommandDecorators } from 'yamdbf';
import { Collection } from 'discord.js';
import { ModClient } from '../../../lib/ModClient';
import { modOnly } from '../../../lib/Util';

const { resolveArgs, expect } = Middleware;
const { using } = CommandDecorators;

export default class Purge extends Command<ModClient>
{
	public constructor(client: ModClient)
	{
		super(client, {
			name: 'purge',
			aliases: [],
			description: 'Remove the last given quantity of messages from the channel',
			usage: '<prefix>purge <quantity>',
			extraHelp: 'Can delete up to 100 messages per command call',
			group: 'prune',
			guildOnly: true
		});
	}

	@modOnly
	@using(resolveArgs({ '<quantity>': 'Number' }))
	@using(expect({ '<quantity>': 'Number' }))
	public async action(message: Message, [quantity]: [int]): Promise<any>
	{
		if (!quantity || quantity < 1)
			return message.channel.send('You must enter a number of messages to purge.');

		let messages: Collection<string, Message>;
		messages = (await message.channel.fetchMessages(
			{ limit: Math.min(quantity, 100), before: message.id }));

		message.delete();
		await message.channel.bulkDelete(messages);
		return message.author.send('Purge operation completed.');
	}
}
