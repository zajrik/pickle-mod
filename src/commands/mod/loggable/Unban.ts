import { Command, Message, Middleware, CommandDecorators } from 'yamdbf';
import { User } from 'discord.js';
import { ModClient } from '../../../lib/ModClient';
import { modOnly } from '../../../lib/Util';

const { resolveArgs, expect } = Middleware;
const { using } = CommandDecorators;

export default class extends Command<ModClient>
{
	public constructor(client: ModClient)
	{
		super(client, {
			name: 'unban',
			description: 'Unban a user by id',
			usage: '<prefix>unban <user> <...reason>',
			group: 'mod',
			guildOnly: true
		});
	}

	@modOnly
	@using(resolveArgs({ '<user>': 'BannedUser', '<...reason>': 'String' }))
	@using(expect({ '<user>': 'User', '<...reason>': 'String' }))
	public async action(message: Message, [user, reason]: [User, string]): Promise<any>
	{
		const id: string = user.id;
		const unbanning: Message = <Message> await message.channel.send(
			`Unbanning ${user.username}#${user.discriminator}...`);

		try
		{
			this.client.mod.actions.unban(id, message.guild);
			const unbanCase: Message = <Message> await this.client.mod.logs.awaitBanCase(message.guild, user, 'Unban');
			this.client.mod.logs.editCase(message.guild, unbanCase, message.author, reason);

			return unbanning.edit(`Successfully unbanned ${user.username}#${user.discriminator}`);
		}
		catch (err)
		{
			return unbanning.edit(`Failed to unban user with id \`${id}\``);
		}
	}
}
