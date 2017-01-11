import { Bot, Command } from 'yamdbf';
import { User, Message } from 'discord.js';

export default class Tags extends Command<Bot>
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
			return message.channel.send('There are currently no saved tags.');
		return message.channel.send(`**Current tags:**\n${Object.keys(tags).sort().join(', ')}`);
	}
};
