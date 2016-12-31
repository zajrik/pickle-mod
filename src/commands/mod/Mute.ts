'use strict';
import { Bot, Command, LocalStorage, Message } from 'yamdbf';
import { User, Role } from 'discord.js';
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
			guildOnly: true
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!(<ModBot> this.bot).mod.canCallModCommand(message)) return;
		if (!(<ModBot> this.bot).mod.hasSetMutedRole(message.guild)) return;
		if (!mentions[0]) return message.channel.sendMessage('You must mention a user to mute.');
		const user: User = mentions[0];

		if (user.id === message.author.id)
			return message.channel.sendMessage(`I don't think you want to mute yourself.`);

		if (message.guild.member(user.id).roles.has(message.guild.storage.getSetting('modrole'))
			|| user.id === message.guild.ownerID || user.bot)
			return message.channel.sendMessage('You may not use this command on that user.');

		const durationString: string = <string> args[0];
		const duration: number = Time.parseShorthand(durationString);
		const reason: string = (duration ? args.slice(1) : args).join(' ').trim();
		if (!reason) return message.channel.sendMessage('You must provide a reason to mute that user.');

		const mutedRole: string = message.guild.storage.getSetting('mutedrole');
		if (message.guild.member(user.id).roles.has(mutedRole))
			return message.channel.sendMessage(`That user is already muted`);

		try
		{
			const storage: LocalStorage = this.bot.storage;
			await (<ModBot> this.bot).mod.mute(user, message.guild);
			await (<ModBot> this.bot).mod.caseLog(user, message.guild, 'Mute', reason, message.author, durationString);
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
			return message.channel.sendMessage(`Muted ${user.username}#${user.discriminator}`);
		}
		catch (err)
		{
			console.log(err.stack);
		}
	}
}
