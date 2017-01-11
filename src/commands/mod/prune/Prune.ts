import { Command } from 'yamdbf';
import { User, Message } from 'discord.js';
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
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.hasModRole(message.member)) return;
		const quantity: number = <number> args[0];
		const member: User = mentions[0];

		if (!quantity || quantity < 1)
			return message.channel.send('You must enter a number of messages to prune');

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
