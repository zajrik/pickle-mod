import { Command, Message, Middleware } from 'yamdbf';
import { User, GuildMember } from 'discord.js';
import ModBot from '../../../lib/ModBot';
import { modCommand } from '../../../lib/Util';

export default class Softban extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'softban',
			aliases: [],
			description: 'Softban a user',
			usage: '<prefix>softban <user> <...reason>',
			extraHelp: '',
			group: 'mod',
			guildOnly: true
		});

		this.use(modCommand);

		const { resolveArgs, expect } = Middleware;
		this.use(resolveArgs({ '<user>': 'User', '<...reason>': 'String' }));
		this.use(expect({ '<user>': 'User', '<...reason>': 'String' }));
	}

	public async action(message: Message, [user, reason]: [User, string]): Promise<any>
	{
		if (user.id === message.author.id)
			return message.channel.send(`I don't think you want to softban yourself.`);

		let member: GuildMember;
		try { member = await message.guild.fetchMember(user); }
		catch (err) {}

		const modRole: string = message.guild.storage.getSetting('modrole');
		if ((member && member.roles.has(modRole)) || user.id === message.guild.ownerID || user.bot)
			return message.channel.send('You may not use this command on that user.');

		const kicking: Message = <Message> await message.channel.send(
			`Softbanning ${user.username}#${user.discriminator}... *(Waiting for unban)*`);

		try
		{
			await user.send(`You have been softbanned from ${message.guild.name}\n\n**Reason:** ${
				reason}\n\nA softban is a kick that uses ban+unban to remove your messages from `
				+ `the server. You may rejoin momentarily.`);
		}
		catch (err) { console.log(`Failed to send softban DM to ${user.username}#${user.discriminator}`); }

		this.bot.mod.actions.softban(user, message.guild);
		let cases: Message[] = <Message[]> await this.bot.mod.logger.awaitBanCase(message.guild, user, 'Softban');
		this.bot.mod.logger.mergeSoftban(message.guild, cases[0], cases[1], message.author, reason);

		return kicking.edit(`Successfully softbanned ${user.username}#${user.discriminator}`);
	}
}
