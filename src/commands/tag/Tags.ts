import { Bot, Command } from 'yamdbf';
import { User, Message } from 'discord.js';

export default class Tags extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'tags',
			aliases: [],
			description: 'List all stored tags',
			usage: '<prefix>tags',
			extraHelp: '',
			group: 'tag'
		});
	}

	public action(message: Message, args: Array<string | number>, mentions: User[], original: string): any
	{
		const tags: Object = this.bot.storage.getItem('tags');
		if (!tags || Object.keys(tags).length === 0)
			return message.channel.sendMessage('There are currently no saved tags.');
		return message.channel.sendMessage(`**Current tags:**\n${Object.keys(tags).sort().join(', ')}`);
	}
};
