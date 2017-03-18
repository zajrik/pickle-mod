import { Command, Message, Middleware } from 'yamdbf';
import { GuildMember, User } from 'discord.js';
import ModBot from '../../../lib/ModBot';
import { modOnly } from '../../../lib/Util';

export default class Kick extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'kick',
			aliases: [],
			description: 'Kick a user',
			usage: '<prefix>kick <member> <...reason>',
			extraHelp: '',
			group: 'mod',
			guildOnly: true
		});

		const { resolveArgs, expect } = Middleware;
		this.use(resolveArgs({ '<member>': 'Member', '<...reason>': 'String' }));
		this.use(expect({ '<member>': 'Member', '<...reason>': 'String' }));
	}

	@modOnly
	public async action(message: Message, [member, reason]: [GuildMember, string]): Promise<any>
	{
		const user: User = member.user;
		if (user.id === message.author.id)
			return message.channel.send(`I don't think you want to kick yourself.`);

		const modRole: string = message.guild.storage.getSetting('modrole');
		if ((member.roles.has(modRole)) || user.id === message.guild.ownerID || user.bot)
			return message.channel.send('You may not use this command on that user.');

		const kicking: Message = <Message> await message.channel.send(
			`Kicking ${user.username}#${user.discriminator}...`);

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
