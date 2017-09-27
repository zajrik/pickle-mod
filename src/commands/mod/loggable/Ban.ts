import { Command, Message, Middleware, CommandDecorators, Logger, logger } from 'yamdbf';
import { User, GuildMember, RichEmbed, Collection } from 'discord.js';
import { prompt, PromptResult } from '../../../util/Util';
import { modOnly, stringResource as res } from '../../../util/Util';
import { ModClient } from '../../../client/ModClient';

const { resolve, expect } = Middleware;
const { using } = CommandDecorators;

export default class extends Command<ModClient>
{
	@logger('Command:Ban')
	private readonly _logger: Logger;

	public constructor()
	{
		super({
			name: 'ban',
			aliases: ['b&', 'banne'],
			desc: 'Ban a user',
			usage: '<prefix>ban <user> <...reason>',
			group: 'mod',
			guildOnly: true
		});
	}

	@modOnly
	@using(resolve('user: User, ...reason: String'))
	@using(expect('user: User, ...reason: String'))
	public async action(message: Message, [user, reason]: [User, string]): Promise<any>
	{
		if (this.client.mod.actions.isLocked(message.guild, user))
			return message.channel.send('That user is currently being moderated by someone else');

		this.client.mod.actions.setLock(message.guild, user);
		try
		{
			if (user.id === message.author.id)
				return message.channel.send(`I don't think you want to ban yourself.`);

			let member: GuildMember;
			try { member = await message.guild.fetchMember(user); }
			catch {}

			const modRole: string = await message.guild.storage.settings.get('modrole');
			if ((member && member.roles.has(modRole)) || user.id === message.guild.ownerID || user.bot)
				return message.channel.send('You may not use this command on that user.');

			const bans: Collection<string, User> = await message.guild.fetchBans();
			if (bans.has(user.id)) return message.channel.send('That user is already banned in this server.');

			const offenses: any = await this.client.mod.actions.checkUserHistory(message.guild, user);
			const embed: RichEmbed = new RichEmbed()
				.setColor(offenses.color)
				.setDescription(`**Reason:** ${reason}`)
				.setAuthor(user.tag, user.avatarURL)
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
			catch { this._logger.error(`Failed to send ban DM to ${user.tag}`); }

			const banning: Message = <Message> await message.channel.send(`Banning ${user.tag}...`);
			this.client.mod.logs.setCachedCase(message.guild, user, 'Ban');

			try { await this.client.mod.actions.ban(user, message.guild, reason); }
			catch (err)
			{
				this.client.mod.logs.removeCachedCase(message.guild, user, 'Ban');
				return banning.edit(`Error while banning: ${err}`);
			}

			await this.client.mod.logs.logCase(user, message.guild, 'Ban', reason, message.author);
			this._logger.log(`Banned: '${user.tag}' from '${message.guild.name}'`);
			return banning.edit(`Successfully banned ${user.tag}`);
		}
		finally { this.client.mod.actions.removeLock(message.guild, user); }
	}
}
