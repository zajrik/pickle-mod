import { Command, Message, Middleware, CommandDecorators } from 'yamdbf';
import { User } from 'discord.js';
import { ModClient } from '../../../client/ModClient';
import { modOnly } from '../../../util/Util';

const { resolve, expect } = Middleware;
const { using } = CommandDecorators;

export default class extends Command<ModClient>
{
	public constructor(client: ModClient)
	{
		super({
			name: 'unban',
			desc: 'Unban a user by id',
			usage: '<prefix>unban <user> <...reason>',
			group: 'mod',
			guildOnly: true
		});
	}

	@modOnly
	@using(resolve('user: BannedUser, ...reason: String'))
	@using(expect('user: User, ...reason: String'))
	public async action(message: Message, [user, reason]: [User, string]): Promise<any>
	{
		if (this.client.mod.actions.isLocked(message.guild, user))
			return message.channel.send('That user is currently being moderated by someone else');

		this.client.mod.actions.setLock(message.guild, user);
		try
		{
			const id: string = user.id;
			const unbanning: Message = <Message> await message.channel.send(`Unbanning ${user.tag}...`);

			this.client.mod.logs.setCachedCase(message.guild, user, 'Unban');
			try { await this.client.mod.actions.unban(user.id, message.guild); }
			catch
			{
				this.client.mod.logs.removeCachedCase(message.guild, user, 'Unban');
				return unbanning.edit(`Failed to unban user with id \`${id}\``);
			}
			await this.client.mod.logs.logCase(user, message.guild, 'Unban', reason, message.author);
			return unbanning.edit(`Successfully unbanned ${user.tag}`);
		}
		finally { this.client.mod.actions.removeLock(message.guild, user); }
	}
}
