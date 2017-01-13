import { Command, Message } from 'yamdbf';
import { User, GuildMember } from 'discord.js';
import ModBot from '../../../lib/ModBot';

export default class Warn extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'warn',
			aliases: [],
			description: 'Give a formal warning to a user',
			usage: '<prefix>warn <@user> <reason>',
			extraHelp: '',
			argOpts: { stringArgs: true },
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return;
		if (!mentions[0]) return message.channel.send('You must mention a user to warn.');
		const user: User = mentions[0];

		if (user.id === message.author.id)
			return message.channel.send(`I don't think you want to warn yourself.`);

		const modRole: string = message.guild.storage.getSetting('modrole');
		const member: GuildMember = await message.guild.fetchMember(user);
		if (member.roles.has(modRole) || user.id === message.guild.ownerID || user.bot)
			return message.channel.send('You may not use this command on that user.');

		const reason: string = args.join(' ').trim();
		if (!reason) return message.channel.send('You must provide a reason to warn that user.');

		await this.bot.mod.actions.warn(user, message.guild);
		await this.bot.mod.logger.caseLog(user, message.guild, 'Warn', reason, message.author);
		await user.send(`You've received a warning in ${message.guild.name}.\n\`Reason:\` ${reason}`);
		console.log(`Warned ${user.username}#${user.discriminator} in guild '${message.guild.name}'`);
		message.channel.send(`Warned ${user.username}#${user.discriminator}`);
	}
}
