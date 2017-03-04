import { modCommand } from '../../../lib/Util';
import { Command, Message, Middleware } from 'yamdbf';
import { GuildMember } from 'discord.js';
import ModBot from '../../../lib/ModBot';

export default class Prune extends Command<ModBot>
{
	public constructor(bot: ModBot)
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

		this.use(modCommand);

		this.use(Middleware.resolveArgs({ '<quantity>': 'Number', '<member>': 'Member' }));
		this.use(Middleware.expect({ '<quantity>': 'Number', '<member>': 'Member' }));
	}

	public async action(message: Message, [quantity, member]: [int, GuildMember]): Promise<any>
	{
		if (!quantity || quantity < 1)
			return message.channel.send('You must enter a valid number of messages to prune');

		if (!member) return message.channel.send('You must mention a user to prune');

		const messages: Message[] = (await message.channel.fetchMessages(
			{ limit: 100, before: message.id }))
			.filter((a: Message) => a.author.id === member.id)
			.array();
		messages.length = Math.min(quantity, messages.length);
		if (messages.length === 0) return message.reply(
			'There were no messages by that user to delete in the past 100 messages.');

		if (messages.length === 1) await messages[0].delete();
		else await message.channel.bulkDelete(messages);

		return message.author.send('Prune operation completed.');
	}
}
