'use strict';
import { Bot, Command, LocalStorage } from 'yamdbf';
import { User, Message } from 'discord.js';
import { ActiveMutes } from '../../lib/ModActions';
import ModBot from '../../lib/ModBot';
import Time from '../../lib/Time';

export default class Mute extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'mute',
			aliases: [],
			description: 'Mute a user',
			usage: '<prefix>mute <@user> [duration] <reason>',
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

		if (user.id === message.author.id)
			return message.channel.sendMessage(`I don't think you want to mute yourself.`)
				.then((res: Message) => res.delete(5000));

		if (message.guild.members.get(user.id).roles.find('name', 'Mod') || user.id === message.guild.ownerID || user.bot)
			return message.channel.sendMessage('You may not use this command on that user.')
				.then((res: Message) => res.delete(5000));

		const duration: number = Time.parseShorthand(<string> args.shift());
		const reason: string = args.join(' ').trim();
		if (!reason) return message.channel.sendMessage('You must provide a reason to mute that user.')
			.then((res: Message) => res.delete(5000));

		if (message.guild.members.get(user.id).roles.find('name', 'Muted'))
			return message.channel.sendMessage(`That user is already muted`)
				.then((res: Message) => res.delete(5000));
		try
		{
			const storage: LocalStorage = this.bot.storage;
			await (<ModBot> this.bot).mod.mute(user, message.guild);
			await (<ModBot> this.bot).mod.caseLog(user, message.guild, 'Mute', reason, message.author, m[0]);
			await storage.nonConcurrentAccess('activeMutes', (key: string) =>
			{
				let activeMutes: ActiveMutes = storage.getItem(key) || {};
				if (!activeMutes[user.id]) activeMutes[user.id] = [];
				activeMutes[user.id].push({
					raw: `${user.username}#${user.discriminator}`,
					user: user.id,
					guild: message.guild.id,
					duration: duration,
					timestamp: message.createdTimestamp
				});
				storage.setItem(key, activeMutes);
				console.log(`Muted user '${user.username}#${user.discriminator}'`);
			});
			return message.channel.sendMessage(`Muted ${user.username}#${user.discriminator}`)
				.then((res: Message) => res.delete(5000));
		}
		catch (err)
		{
			console.log(err.stack);
		}
	}
};
