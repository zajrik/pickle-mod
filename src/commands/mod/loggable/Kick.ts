import { Command, Message } from 'yamdbf';
import { User, GuildMember } from 'discord.js';
import ModBot from '../../../lib/ModBot';

export default class Kick extends Command<ModBot>
{
	public constructor(bot: ModBot)
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
		if (!this.bot.mod.canCallModCommand(message)) return;
		if (!mentions[0]) return message.channel.send('You must mention a user to kick.');
		const user: User = mentions[0];

		if (user.id === message.author.id)
			return message.channel.send(`I don't think you want to kick yourself.`);

		const modRole: string = message.guild.storage.getSetting('modrole');
		const member: GuildMember = await message.guild.fetchMember(user);
		if (member.roles.has(modRole) || user.id === message.guild.ownerID || user.bot)
			return message.channel.send('You may not use this command on that user.');

		const reason: string = args.join(' ').trim();
		if (!reason) return message.channel.send('You must provide a reason to kick that user.');

		await user.send(`You have been kicked from ${message.guild.name}\n\n**Reason:** ${reason}`);
		await this.bot.mod.actions.kick(user, message.guild);
		await this.bot.mod.logger.caseLog(user, message.guild, 'Kick', reason, message.author);
		console.log(`Kicked ${user.username}#${user.discriminator} from guild '${message.guild.name}'`);
		message.channel.send(`Kicked ${user.username}#${user.discriminator}`);
	}
}
