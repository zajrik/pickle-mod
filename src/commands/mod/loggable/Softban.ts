import { Command, Message, Middleware, CommandDecorators, Logger, logger } from 'yamdbf';
import { User, GuildMember, Collection } from 'discord.js';
import { ModClient } from '../../../lib/ModClient';
import { modOnly, stringResource as res } from '../../../lib/Util';

const { resolve, expect } = Middleware;
const { using } = CommandDecorators;

export default class extends Command<ModClient>
{
	@logger private readonly logger: Logger;
	public constructor()
	{
		super({
			name: 'softban',
			desc: 'Softban a user',
			usage: '<prefix>softban <user> <...reason>',
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
				return message.channel.send(`I don't think you want to softban yourself.`);

			let member: GuildMember;
			try { member = await message.guild.fetchMember(user); }
			catch (err) {}

			const modRole: string = await message.guild.storage.settings.get('modrole');
			if ((member && member.roles.has(modRole)) || user.id === message.guild.ownerID || user.bot)
				return message.channel.send('You may not use this command on that user.');

			const bans: Collection<string, User> = await message.guild.fetchBans();
			if (bans.has(user.id)) return message.channel.send('That user is already banned in this server.');

			const kicking: Message = <Message> await message.channel
				.send(`Softbanning ${user.tag}... *(Waiting for unban)*`);

			try { await user.send(res('MSG_DM_SOFTBAN', { guildName: message.guild.name, reason: reason })); }
			catch (err) { this.logger.error('Command:Softban', `Failed to send softban DM to ${user.tag}`); }

			let cases: Message[] = <Message[]> await this.client.mod.logs.awaitCase(message.guild, user, 'Softban', reason);
			this.client.mod.logs.mergeSoftban(message.guild, cases[0], cases[1], message.author, reason);

			this.logger.log('Command:Softban', `Kicked: '${user.tag}' from '${message.guild.name}'`);
			return kicking.edit(`Successfully softbanned ${user.tag}`);
		}
		finally { this.client.mod.actions.removeLock(message.guild, user); }
	}
}
