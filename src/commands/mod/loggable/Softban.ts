import { Bot, Command, Message } from 'yamdbf';
import { User } from 'discord.js';
import ModBot from '../../../lib/ModBot';

export default class Softban extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'softban',
			aliases: [],
			description: 'Softban a user',
			usage: '<prefix>softban <@user> <...reason>',
			extraHelp: '',
			argOpts: { stringArgs: true },
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!(<ModBot> this.bot).mod.canCallModCommand(message)) return;
		if (!mentions[0]) return message.channel.sendMessage('You must mention a user to softban.');
		const user: User = mentions[0];

		if (user.id === message.author.id)
			return message.channel.sendMessage(`I don't think you want to softban yourself.`);

		const modRole: string = message.guild.storage.getSetting('modrole');
		if (message.guild.member(user.id).roles.has(modRole) || user.id === message.guild.ownerID || user.bot)
			return message.channel.sendMessage('You may not use this command on that user.');

		const reason: string = args.join(' ').trim();
		if (!reason) return message.channel.sendMessage('You must provide a reason to ban that user.');

		const kicking: Message = <Message> await message.channel.sendMessage(
			`Softbanning ${user.username}#${user.discriminator}... *(Waiting for unban)*`);

		user.sendMessage(`You have been softbanned from ${message.guild.name}\n\n**Reason:** ${
			reason}\n\nA softban is a kick that uses ban+unban to remove your messages from `
			+ `the server. You may rejoin momentarily.`);
		await (<ModBot> this.bot).mod.softban(user, message.guild);
		return kicking.edit(`Successfully softbanned ${user.username}#${user.discriminator}\n`
			+ `Remember to set reasons for both the ban and unban with `
			+ `\`${this.bot.getPrefix(message.guild)}reason <case#> <...reason>\``);
	}
}
