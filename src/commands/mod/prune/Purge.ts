import { Command, Message, Middleware, CommandDecorators } from 'yamdbf';
import { Collection } from 'discord.js';
import { ModClient } from '../../../client/ModClient';
import { modOnly } from '../../../util/Util';

const { resolve, expect } = Middleware;
const { using } = CommandDecorators;

export default class extends Command<ModClient>
{
	public constructor()
	{
		super({
			name: 'purge',
			desc: 'Remove the last given quantity of messages from the channel',
			usage: '<prefix>purge <quantity>',
			info: 'Can delete up to 100 messages per command call',
			group: 'prune',
			guildOnly: true
		});
	}

	@modOnly
	@using(resolve('quantity: Number'))
	@using(expect('quantity: Number'))
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
