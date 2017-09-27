import { Command, Message, Middleware, CommandDecorators, Logger, logger } from 'yamdbf';
import { GuildMember, User } from 'discord.js';
import { ModClient } from '../../../lib/ModClient';
import { modOnly } from '../../../lib/Util';

const { resolve, expect } = Middleware;
const { using } = CommandDecorators;

export default class extends Command<ModClient>
{
	@logger('Command:Kick')
	private readonly _logger: Logger;

	public constructor()
	{
		super({
			name: 'kick',
			desc: 'Kick a user',
			usage: '<prefix>kick <member> <...reason>',
			group: 'mod',
			guildOnly: true
		});
	}

	@modOnly
	@using(resolve('member: Member, ...reason: String'))
	@using(expect('member: Member, ...reason: String'))
	public async action(message: Message, [member, reason]: [GuildMember, string]): Promise<any>
	{
		if (this.client.mod.actions.isLocked(message.guild, member.user))
			return message.channel.send('That user is currently being moderated by someone else');

		this.client.mod.actions.setLock(message.guild, member.user);
		try
		{
			const user: User = member.user;
			if (user.id === message.author.id)
				return message.channel.send(`I don't think you want to kick yourself.`);

			const modRole: string = await message.guild.storage.settings.get('modrole');
			if ((member.roles.has(modRole)) || user.id === message.guild.ownerID || user.bot)
				return message.channel.send('You may not use this command on that user.');

			const kicking: Message = <Message> await message.channel.send(`Kicking ${user.tag}...`);

			try
			{
				await user.send(`**You have been kicked from ${message.guild.name}**\n\n**Reason:** ${reason}`);
			}
			catch (err)
			{
				this._logger.error(`Failed to send kick DM to ${user.tag}`);
			}

			await this.client.mod.actions.kick(member, message.guild, reason);
			await this.client.mod.logs.logCase(user, message.guild, 'Kick', reason, message.author);
			this._logger.log(`Kicked: '${user.tag}' from '${message.guild.name}'`);
			kicking.edit(`Kicked ${user.tag}`);
		}
		finally { this.client.mod.actions.removeLock(message.guild, member.user); }
	}
}
