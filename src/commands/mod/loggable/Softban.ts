import { Command, Message, Middleware, CommandDecorators, Logger, logger } from 'yamdbf';
import { User, GuildMember } from 'discord.js';
import { ModClient } from '../../../lib/ModClient';
import { modOnly, stringResource as res } from '../../../lib/Util';

const { resolveArgs, expect } = Middleware;
const { using } = CommandDecorators;

export default class Softban extends Command<ModClient>
{
	@logger private readonly logger: Logger;
	public constructor(client: ModClient)
	{
		super(client, {
			name: 'softban',
			aliases: [],
			description: 'Softban a user',
			usage: '<prefix>softban <user> <...reason>',
			extraHelp: '',
			group: 'mod',
			guildOnly: true
		});
	}

	@modOnly
	@using(resolveArgs({ '<user>': 'User', '<...reason>': 'String' }))
	@using(expect({ '<user>': 'User', '<...reason>': 'String' }))
	public async action(message: Message, [user, reason]: [User, string]): Promise<any>
	{
		if (user.id === message.author.id)
			return message.channel.send(`I don't think you want to softban yourself.`);

		let member: GuildMember;
		try { member = await message.guild.fetchMember(user); }
		catch (err) {}

		const modRole: string = await message.guild.storage.settings.get('modrole');
		if ((member && member.roles.has(modRole)) || user.id === message.guild.ownerID || user.bot)
			return message.channel.send('You may not use this command on that user.');

		const kicking: Message = <Message> await message.channel
			.send(`Softbanning ${user.tag}... *(Waiting for unban)*`);

		try { await user.send(res('MSG_DM_SOFTBAN', { guildName: message.guild.name, reason: reason })); }
		catch (err) { this.logger.log('Command:Softban', `Failed to send softban DM to ${user.tag}`); }

		this.client.mod.actions.softban(user, message.guild);
		let cases: Message[] = <Message[]> await this.client.mod.logger.awaitBanCase(message.guild, user, 'Softban');
		this.client.mod.logger.mergeSoftban(message.guild, cases[0], cases[1], message.author, reason);

		return kicking.edit(`Successfully softbanned ${user.username}#${user.discriminator}`);
	}
}
