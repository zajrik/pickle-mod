import { Bot, Command, Message } from 'yamdbf';
import { User, MessageEmbed } from 'discord.js';
import ModBot from '../../../lib/ModBot';

export default class Reason extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'reason',
			aliases: [],
			description: 'Set a reason for a case',
			usage: '<prefix>reason <case#> <...reason>',
			extraHelp: 'Can be used to edit your own cases or to set a reason for a ban/unban case that was posted by the bot',
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!(<ModBot> this.bot).mod.canCallModCommand(message)) return;
		let id: number = <number> args.shift();
		if (id.toString() === 'latest') id = message.guild.storage.getSetting('cases');
		if (!id || isNaN(id)) return message.channel.sendMessage('You must provide a case number.');

		const reason: string = args.join(' ');
		if (!reason) return message.channel.sendMessage('You must provide a reason for this case.');

		const caseMessage: Message = await (<ModBot> this.bot).mod.findCase(message.guild, id);
		if (!caseMessage) return message.channel.sendMessage(`Failed to fetch case.`);
		if (caseMessage.author.id !== this.bot.user.id)
			return message.channel.sendMessage(`I didn't post that case.`);

		const messageEmbed: MessageEmbed = caseMessage.embeds[0];
		if (messageEmbed.author.name !== `${message.author.username}#${message.author.discriminator}`
			&& messageEmbed.author.name !== `${this.bot.user.username}#${this.bot.user.discriminator}`)
			return message.channel.sendMessage('That is not your case to edit.');

		await (<ModBot> this.bot).mod.editCase(message.guild, id, message.author, reason);
		message.channel.sendMessage(`Set reason for case #${id}.`);
	}
}
