import { Client, Command, GuildStorage, Message } from 'yamdbf';

export default class extends Command<Client>
{
	public constructor(client: Client)
	{
		super(client, {
			name: 'tags',
			aliases: [],
			description: 'List all stored tags',
			usage: '<prefix>tags',
			extraHelp: '',
			group: 'tag',
			guildOnly: true
		});
	}

	public async action(message: Message, args: string[]): Promise<any>
	{
		const storage: GuildStorage = message.guild.storage;
		const tags: object = await storage.get('tags');
		if (!tags || Object.keys(tags).length === 0)
			return message.channel.send('There are currently no saved tags.');
		return message.channel.send(`**Current tags:**\n${Object.keys(tags).sort().join(', ')}`);
	}
}
