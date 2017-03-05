import { Bot, Command, GuildStorage, Message } from 'yamdbf';

export default class Tag extends Command<Bot>
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'tag',
			aliases: [],
			description: 'Create/recall/update/delete tags',
			usage: '<prefix>tag [add|del|update] <name> [details]',
			extraHelp: '',
			group: 'tag',
			guildOnly: true
		});
	}

	public action(message: Message, args: string[]): any
	{
		const action: string = args[0];
		const storage: GuildStorage = message.guild.storage;
		if (!storage.exists('tags')) storage.setItem('tags', {});
		switch (action)
		{
			case 'add':
				if (!message.member.roles.find('name', 'Mod')) return;
				if (storage.exists(`tags/${args[1]}`))
					return message.channel.send(
						`Tag "${args[1]}" already exists. Use \`tag update ${args[1]}\` to update it.`);
				storage.setItem(`tags/${args[1]}`, args.slice(2).join(' '));
				return message.channel.send(
					`Created tag "${args[1]}"`);

			case 'del':
				if (!message.member.roles.find('name', 'Mod')) return;
				if (!storage.exists(`tags/${args[1]}`))
					return message.channel.send(`Tag "${args[1]}" does not exist.`);
				storage.removeItem(`tags/${args[1]}`);
				return message.channel.send(`Tag "${args[1]}" deleted`);

			case 'update':
				if (!message.member.roles.find('name', 'Mod')) return;
				if (!storage.exists(`tags/${args[1]}`))
					return message.channel.send(`Tag "${args[1]}" does not exist.`);
				storage.setItem(`tags/${args[1]}`, args.slice(2).join(' '));
				return message.channel.send(`Tag "${args[1]}" updated`);

			default:
				if (!args[0]) return message.channel.send('You must provide an option or a tag');
				if (!storage.exists(`tags/${args[0]}`))
					return message.channel.send(`Tag "${args[0]}" does not exist.`);
				return message.channel.send(storage.getItem(`tags/${args[0]}`));
		}
	}
};
