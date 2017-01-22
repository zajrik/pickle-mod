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
			usage: '<prefix>kick <@user|id> <...reason>',
			extraHelp: '',
			argOpts: { stringArgs: true },
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, [], mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return;
		const args: string[] = original.split(' ').slice(1);
		const idRegex: RegExp = /^(?:<@!?)?(\d+)>?$/;
		if (!idRegex.test(args[0])) return message.channel.send(
			'You must mention a user or provide an ID to kick.');
		const id: string = args.shift().match(idRegex)[1];

		let user: User;
		try { user = await this.bot.fetchUser(id); }
		catch (err) { return message.channel.send('Failed to fetch a user with that ID.'); }

		if (user.id === message.author.id)
			return message.channel.send(`I don't think you want to kick yourself.`);

		let member: GuildMember;
		try { member = await message.guild.fetchMember(user); }
		catch (err) { return message.channel.send('Failed to fetch a member with that ID.'); }

		const modRole: string = message.guild.storage.getSetting('modrole');
		if ((member && member.roles.has(modRole)) || user.id === message.guild.ownerID || user.bot)
			return message.channel.send('You may not use this command on that user.');

		const reason: string = args.join(' ').trim();
		if (!reason) return message.channel.send('You must provide a reason to kick that user.');

		const kicking: Message = <Message> await message.channel.send(`Kicking ${user.username}#${user.discriminator}...`);

		try
		{
			await user.send(`**You have been kicked from ${message.guild.name}**\n\n**Reason:** ${reason}`);
		}
		catch (err)
		{
			console.log(`Failed to send kick DM to ${user.username}#${user.discriminator}`);
		}

		await this.bot.mod.actions.kick(member, message.guild);
		await this.bot.mod.logger.caseLog(user, message.guild, 'Kick', reason, message.author);
		console.log(`Kicked ${user.username}#${user.discriminator} from guild '${message.guild.name}'`);
		kicking.edit(`Kicked ${user.username}#${user.discriminator}`);
	}
}
