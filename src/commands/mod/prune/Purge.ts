import { Command, Message, Middleware } from 'yamdbf';
import { User, Collection } from 'discord.js';
import ModBot from '../../../lib/ModBot';
import { modCommand } from '../../../lib/Util';

export default class Purge extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'purge',
			aliases: [],
			description: 'Remove the last given quantity of messages from the channel',
			usage: '<prefix>purge <quantity>',
			extraHelp: 'Can delete up to 100 messages per command call',
			group: 'prune',
			guildOnly: true
		});

		this.use(modCommand);

		this.use(Middleware.resolveArgs({ '<quantity>': 'Number' }));
		this.use(Middleware.expect({ '<quantity>': 'Number' }));
	}

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
