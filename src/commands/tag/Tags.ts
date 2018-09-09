import { Client, Command, GuildStorage, Message } from '@yamdbf/core';

export default class extends Command<Client>
{
	public constructor()
	{
		super({
			name: 'tags',
			desc: 'List all stored tags',
			usage: '<prefix>tags',
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
