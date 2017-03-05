import { Bot, Command, GuildStorage, Message } from 'yamdbf';

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
			group: 'tag',
			guildOnly: true
		});
	}

	public action(message: Message, args: string[]): any
	{
		const storage: GuildStorage = message.guild.storage;
		const tags: object = storage.getItem('tags');
		if (!tags || Object.keys(tags).length === 0)
			return message.channel.send('There are currently no saved tags.');
		return message.channel.send(`**Current tags:**\n${Object.keys(tags).sort().join(', ')}`);
	}
};
