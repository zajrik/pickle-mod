import { Command, Message, Middleware, CommandDecorators } from 'yamdbf';
import { User } from 'discord.js';
import { ModClient } from '../../../lib/ModClient';
import { modOnly } from '../../../lib/Util';

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

			try
			{
				const unbanCase: Message = <Message> await this.client.mod.logs.awaitCase(message.guild, user, 'Unban', reason);
				this.client.mod.logs.editCase(message.guild, unbanCase, message.author, reason);

				return unbanning.edit(`Successfully unbanned ${user.tag}`);
			}
			catch (err)
			{
				return unbanning.edit(`Failed to unban user with id \`${id}\``);
			}
		}
		finally { this.client.mod.actions.removeLock(message.guild, user); }
	}
}
