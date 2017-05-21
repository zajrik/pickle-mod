import { Command, Message, Middleware, CommandDecorators, Logger, logger } from 'yamdbf';
import { User, GuildMember, RichEmbed } from 'discord.js';
import { prompt, PromptResult } from '../../../lib/Util';
import { modOnly, stringResource as res } from '../../../lib/Util';
import { ModClient } from '../../../lib/ModClient';

const { resolveArgs, expect } = Middleware;
const { using } = CommandDecorators;

export default class extends Command<ModClient>
{
	@logger private readonly logger: Logger;
	public constructor(client: ModClient)
	{
		super(client, {
			name: 'ban',
			aliases: ['b&', 'banne'],
			description: 'Ban a user',
			usage: '<prefix>ban <user> <...reason>',
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
			return message.channel.send(`I don't think you want to ban yourself.`);

		let member: GuildMember;
		try { member = await message.guild.fetchMember(user); }
		catch (err) {}

		const modRole: string = await message.guild.storage.settings.get('modrole');
		if ((member && member.roles.has(modRole)) || user.id === message.guild.ownerID || user.bot)
			return message.channel.send('You may not use this command on that user.');

		const offenses: any = await this.client.mod.actions.checkUserHistory(message.guild, user);
		const embed: RichEmbed = new RichEmbed()
			.setColor(offenses.color)
			.setDescription(`**Reason:** ${reason}`)
			.setAuthor(`${user.username}#${user.discriminator}`, user.avatarURL)
			.setFooter(offenses.toString());

		const [result]: [PromptResult] = <[PromptResult]> await prompt(message,
			'Are you sure you want to issue this ban? (__y__es | __n__o)',
			/^(?:yes|y)$/i, /^(?:no|n)$/i, { embed });
		if (result === PromptResult.TIMEOUT) return message.channel.send('Command timed out, aborting ban.');
		if (result === PromptResult.FAILURE) return message.channel.send('Okay, aborting ban.');

		try
		{
			await user.send(res('MSG_DM_BAN', { guildName: message.guild.name, reason: reason }), { split: true });
		}
		catch (err) { this.logger.error('Command:Ban', `Failed to send ban DM to ${user.tag}`); }

		const banning: Message = <Message> await message.channel.send(`Banning ${user.tag}...`);

		this.client.mod.actions.ban(user, message.guild);
		let banCase: Message = <Message> await this.client.mod.logs.awaitBanCase(message.guild, user, 'Ban');
		this.client.mod.logs.editCase(message.guild, banCase, message.author, reason);

		this.logger.log('Command:Ban', `Banned: '${user.tag}' from '${message.guild.name}'`);
		banning.edit(`Successfully banned ${user.tag}`);
	}
}
