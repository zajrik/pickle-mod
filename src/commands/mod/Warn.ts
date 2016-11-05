'use strict';
import { Bot, Command } from 'yamdbf';
import { User, Message } from 'discord.js';
import ModBot from '../../lib/ModBot';

export default class Warn extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'warn',
			aliases: [],
			description: 'Give a formal warning to a user',
			usage: '<prefix>warn <@user> <reason>',
			extraHelp: '',
			group: 'mod',
			roles: ['Mod']
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		message.delete();
		if (!mentions[0]) return message.channel.sendMessage('You must mention a user to warn.');
		const user: User = mentions[0];

		if (user.id === message.author.id)
			return message.channel.sendMessage(`I don't think you want to warn yourself.`)
				.then((res: Message) => res.delete(5000));

		if (message.guild.members.get(user.id).roles.find('name', 'Mod') || user.id === message.guild.ownerID || user.bot)
			return message.channel.sendMessage('You may not use this command on that user.')
				.then((res: Message) => res.delete(5000));

		const reason: string = args.join(' ').trim();
		if (!reason) return message.channel.sendMessage('You must provide a reason to warn that user.')
			.then((res: Message) => res.delete(5000));

		await (<ModBot> this.bot).mod.warn(user, message.guild);
		await (<ModBot> this.bot).mod.caseLog(user, message.guild, 'Warn', reason, message.author);
		await user.sendMessage(`You've received a warning in ${message.guild.name}.\n\`Reason:\` ${reason}`);
		console.log(`Warned ${user.username}#${user.discriminator} in guild '${message.guild.name}'`);
		message.channel.sendMessage(`Warned ${user.username}#${user.discriminator}`)
			.then((res: Message) => res.delete(5000));
	}
}
