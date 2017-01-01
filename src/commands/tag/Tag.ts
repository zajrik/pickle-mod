import { Bot, Command } from 'yamdbf';
import { User, Message } from 'discord.js';

export default class Tag extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'tag',
			aliases: [],
			description: 'Create/recall/update/delete tags',
			usage: '<prefix>tag [add|del|update] <name> [details]',
			extraHelp: '',
			group: 'tag'
		});
	}

	public action(message: Message, args: Array<string | number>, mentions: User[], original: string): any
	{
		const action: string = <string> args[0];
		if (!this.bot.storage.exists('tags')) this.bot.storage.setItem('tags', {});
		switch (action)
		{
			case 'add':
				if (!message.member.roles.find('name', 'Mod')) return;
				if (this.bot.storage.exists(`tags/${args[1]}`))
					return message.channel.sendMessage(
						`Tag "${args[1]}" already exists. Use \`tag update ${args[1]}\` to update it.`);
				this.bot.storage.setItem(`tags/${args[1]}`, args.slice(2).join(' '));
				return message.channel.sendMessage(
					`Created tag "${args[1]}"`);

			case 'del':
				if (!message.member.roles.find('name', 'Mod')) return;
				if (!this.bot.storage.exists(`tags/${args[1]}`))
					return message.channel.sendMessage(`Tag "${args[1]}" does not exist.`);
				this.bot.storage.removeItem(`tags/${args[1]}`);
				return message.channel.sendMessage(`Tag "${args[1]}" deleted`);

			case 'update':
				if (!message.member.roles.find('name', 'Mod')) return;
				if (!this.bot.storage.exists(`tags/${args[1]}`))
					return message.channel.sendMessage(`Tag "${args[1]}" does not exist.`);
				this.bot.storage.setItem(`tags/${args[1]}`, args.slice(2).join(' '));
				return message.channel.sendMessage(`Tag "${args[1]}" updated`);

			default:
				if (!args[0]) return message.channel.sendMessage('You must provide an option or a tag');
				if (!this.bot.storage.exists(`tags/${args[0]}`))
					return message.channel.sendMessage(`Tag "${args[0]}" does not exist.`);
				return message.channel.sendMessage(this.bot.storage.getItem(`tags/${args[0]}`));
		}
	}
};
