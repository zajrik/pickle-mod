import { Command, Message, Middleware, CommandDecorators, Logger, logger } from 'yamdbf';
import { User, GuildMember } from 'discord.js';
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
			name: 'warn',
			aliases: [],
			description: 'Give a formal warning to a user',
			usage: '<prefix>warn <member> <...reason>',
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
			return message.channel.send(`I don't think you want to warn yourself.`);

		const modRole: string = await message.guild.storage.settings.get('modrole');
		if ((member && member.roles.has(modRole)) || user.id === message.guild.ownerID || user.bot)
			return message.channel.send('You may not use this command on that user.');

		const warning: Message = <Message> await message.channel.send(`Warning ${user.tag}...`);

		try
		{
			await user.send(`**You've received a warning in ${message.guild.name}.**\n\n**Reason:** ${reason}`);
		}
		catch (err)
		{
			message.channel.send(
				`Logged case but failed to send warning DM to ${user.tag}.`);
		}

		await this.client.mod.actions.warn(member, message.guild);
		await this.client.mod.logs.logCase(user, message.guild, 'Warn', reason, message.author);
		this.logger.log('Command:Warn', `Warned: '${user.tag}' in '${message.guild.name}'`);
		warning.edit(`Warned ${user.tag}`);
	}
}
