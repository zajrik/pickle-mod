import { Client, Command, GuildStorage, Message } from '@yamdbf/core';

export default class extends Command<Client>
{
	public constructor()
	{
		super({
			name: 'tag',
			desc: 'Create/recall/update/delete tags',
			usage: '<prefix>tag [add|del|update] <name> [details]',
			group: 'tag',
			guildOnly: true
		});
	}

	public async action(message: Message, args: string[]): Promise<any>
	{
		const action: string = args[0];
		const storage: GuildStorage = message.guild.storage;
		const modRole: string = await storage.settings.get('modrole') || '';
		if (!await storage.exists('tags')) await storage.set('tags', {});
		switch (action)
		{
			case 'add':
				if (!message.member.roles.has(modRole)) return;
				if (await storage.exists(`tags.${args[1]}`))
					return message.channel.send(
						`Tag "${args[1]}" already exists. Use \`tag update ${args[1]}\` to update it.`);
				await storage.set(`tags.${args[1]}`, args.slice(2).join(' '));
				return message.channel.send(
					`Created tag "${args[1]}"`);

			case 'del':
				if (!message.member.roles.has(modRole)) return;
				if (!await storage.exists(`tags.${args[1]}`))
					return message.channel.send(`Tag "${args[1]}" does not exist.`);
				await storage.remove(`tags.${args[1]}`);
				return message.channel.send(`Tag "${args[1]}" deleted`);

			case 'update':
				if (!message.member.roles.has(modRole)) return;
				if (!await storage.exists(`tags.${args[1]}`))
					return message.channel.send(`Tag "${args[1]}" does not exist.`);
				await storage.set(`tags.${args[1]}`, args.slice(2).join(' '));
				return message.channel.send(`Tag "${args[1]}" updated`);

			default:
				if (!args[0]) return message.channel.send('You must provide an option or a tag');
				if (!await storage.exists(`tags.${args[0]}`))
					return message.channel.send(`Tag "${args[0]}" does not exist.`);
				return message.channel.send(await storage.get(`tags.${args[0]}`));
		}
	}
}
