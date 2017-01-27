import { Command, Message } from 'yamdbf';
import { User, GuildMember } from 'discord.js';
import ModBot from '../../../lib/ModBot';
import { parseArgs } from '../../../lib/Util';

export default class Warn extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'warn',
			aliases: [],
			description: 'Give a formal warning to a user',
			usage: '<prefix>warn <@user|id> <reason>',
			extraHelp: '',
			argOpts: { stringArgs: true },
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, [], mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return;

		const args: string[] = parseArgs(original);
		const idRegex: RegExp = /^(?:<@!?)?(\d+)>?$/;
		if (!idRegex.test(args[0])) return message.channel.send(
			'You must mention a user or provide an ID to warn.');
		const id: string = args.shift().match(idRegex)[1];

		let user: User;
		try { user = await this.bot.fetchUser(id); }
		catch (err) { return message.channel.send('Failed to fetch a user with that ID.'); }

		if (user.id === message.author.id)
			return message.channel.send(`I don't think you want to warn yourself.`);

		let member: GuildMember;
		try { member = await message.guild.fetchMember(user); }
		catch (err) { return message.channel.send('Failed to fetch a member with that ID.'); }

		const modRole: string = message.guild.storage.getSetting('modrole');
		if ((member && member.roles.has(modRole)) || user.id === message.guild.ownerID || user.bot)
			return message.channel.send('You may not use this command on that user.');

		const reason: string = args.join(' ').trim();
		if (!reason) return message.channel.send('You must provide a reason to warn that user.');

		const warning: Message = <Message> await message.channel.send(
			`Warning ${user.username}#${user.discriminator}...`);

		try
		{
			await user.send(`**You've received a warning in ${message.guild.name}.**\n\n**Reason:** ${reason}`);
		}
		catch (err)
		{
			message.channel.send(
				`Logged case but failed to send warning DM to ${user.username}#${user.discriminator}.`);
		}

		await this.bot.mod.actions.warn(user, message.guild);
		await this.bot.mod.logger.caseLog(user, message.guild, 'Warn', reason, message.author);
		console.log(`Warned ${user.username}#${user.discriminator} in guild '${message.guild.name}'`);
		warning.edit(`Warned ${user.username}#${user.discriminator}`);
	}
}
