import { Command, Message, Middleware, CommandDecorators, Logger, logger } from 'yamdbf';
import { GuildMember, User } from 'discord.js';
import { ModClient } from '../../../lib/ModClient';
import { modOnly } from '../../../lib/Util';

const { resolveArgs, expect } = Middleware;
const { using } = CommandDecorators;

export default class extends Command<ModClient>
{
	@logger private readonly logger: Logger;
	public constructor(client: ModClient)
	{
		super(client, {
			name: 'kick',
			aliases: [],
			description: 'Kick a user',
			usage: '<prefix>kick <member> <...reason>',
			extraHelp: '',
			group: 'mod',
			guildOnly: true
		});
	}

	@modOnly
	@using(resolveArgs({ '<member>': 'Member', '<...reason>': 'String' }))
	@using(expect({ '<member>': 'Member', '<...reason>': 'String' }))
	public async action(message: Message, [member, reason]: [GuildMember, string]): Promise<any>
	{
		const user: User = member.user;
		if (user.id === message.author.id)
			return message.channel.send(`I don't think you want to kick yourself.`);

		const modRole: string = await message.guild.storage.settings.get('modrole');
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
			this.logger.error('Command:Kick', `Failed to send kick DM to ${user.tag}`);
		}

		await this.client.mod.actions.kick(member, message.guild);
		await this.client.mod.logs.logCase(user, message.guild, 'Kick', reason, message.author);
		this.logger.log(`Kicked: '${user.tag}' from '${message.guild.name}'`);
		kicking.edit(`Kicked ${user.tag}`);
	}
}
