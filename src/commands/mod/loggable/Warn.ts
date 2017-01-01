import { Bot, Command, Message } from 'yamdbf';
import { User } from 'discord.js';
import ModBot from '../../../lib/ModBot';

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
			group: 'mod'
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!(<ModBot> this.bot).mod.canCallModCommand(message)) return;
		if (!mentions[0]) return message.channel.sendMessage('You must mention a user to warn.');
		const user: User = mentions[0];

		if (user.id === message.author.id)
			return message.channel.sendMessage(`I don't think you want to warn yourself.`);

		const modRole: string = message.guild.storage.getSetting('modrole');
		if (message.guild.member(user.id).roles.has(modRole) || user.id === message.guild.ownerID || user.bot)
			return message.channel.sendMessage('You may not use this command on that user.');

		const reason: string = args.join(' ').trim();
		if (!reason) return message.channel.sendMessage('You must provide a reason to warn that user.');

		await (<ModBot> this.bot).mod.warn(user, message.guild);
		await (<ModBot> this.bot).mod.caseLog(user, message.guild, 'Warn', reason, message.author);
		await user.sendMessage(`You've received a warning in ${message.guild.name}.\n\`Reason:\` ${reason}`);
		console.log(`Warned ${user.username}#${user.discriminator} in guild '${message.guild.name}'`);
		message.channel.sendMessage(`Warned ${user.username}#${user.discriminator}`)
			.then((res: Message) => res.delete(5000));
	}
}
