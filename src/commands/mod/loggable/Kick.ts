import { Bot, Command, Message } from 'yamdbf';
import { User } from 'discord.js';
import ModBot from '../../../lib/ModBot';

export default class Kick extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'kick',
			aliases: [],
			description: 'Kick a user',
			usage: '<prefix>kick <@user> <...reason>',
			extraHelp: '',
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!(<ModBot> this.bot).mod.canCallModCommand(message)) return;
		if (!mentions[0]) return message.channel.sendMessage('You must mention a user to kick.');
		const user: User = mentions[0];

		if (user.id === message.author.id)
			return message.channel.sendMessage(`I don't think you want to kick yourself.`);

		const modRole: string = message.guild.storage.getSetting('modrole');
		if (message.guild.member(user.id).roles.has(modRole) || user.id === message.guild.ownerID || user.bot)
			return message.channel.sendMessage('You may not use this command on that user.');

		const reason: string = args.join(' ').trim();
		if (!reason) return message.channel.sendMessage('You must provide a reason to kick that user.');

		await (<ModBot> this.bot).mod.kick(user, message.guild);
		await (<ModBot> this.bot).mod.caseLog(user, message.guild, 'Kick', reason, message.author);
		console.log(`Kicked ${user.username}#${user.discriminator} from guild '${message.guild.name}'`);
		user.sendMessage(`You have been kicked from ${message.guild.name}\n\n**Reason:** ${reason}`);
		message.channel.sendMessage(`Kicked ${user.username}#${user.discriminator}`);
	}
}
