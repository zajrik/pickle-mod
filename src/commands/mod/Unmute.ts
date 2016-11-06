'use strict';
import { Bot, Command, LocalStorage } from 'yamdbf';
import { User, Message } from 'discord.js';
import { ActiveMutes, MuteObj } from '../../lib/ModActions';
import ModBot from '../../lib/ModBot';

export default class Unmute extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'unmute',
			aliases: [],
			description: 'Unmute a user',
			usage: '<prefix>unmute <@user>',
			extraHelp: '',
			group: 'mod',
			roles: ['Mod']
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		message.delete();
		if (!mentions[0]) return message.channel.sendMessage('You must mention a user to mute.');
		const user: User = mentions[0];

		if (!message.guild.members.get(user.id).roles.find('name', 'Muted'))
			return message.channel.sendMessage(`That user is not muted`)
				.then((res: Message) => res.delete(5000));
		try
		{
			const storage: LocalStorage = this.bot.storage;
			await (<ModBot> this.bot).mod.unmute(user, message.guild);
			await storage.nonConcurrentAccess('activeMutes', (key: string) =>
			{
				let activeMutes: ActiveMutes = storage.getItem(key) || {};
				activeMutes[user.id] = activeMutes[user.id].filter((a: MuteObj) => a.guild !== message.guild.id);
				storage.setItem(key, activeMutes);
				console.log(`Unmuted user '${user.username}#${user.discriminator}'`);
			});
			user.sendMessage(`You have been unmuted on ${message.guild.name}. You may now send messages.`);
			return message.channel.sendMessage(`Unmuted ${user.username}#${user.discriminator}`)
				.then((res: Message) => res.delete(5000));
		}
		catch (err)
		{
			console.log(err.stack);
		}
	}
}
