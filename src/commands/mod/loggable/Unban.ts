import { Command, Message, Middleware } from 'yamdbf';
import { User } from 'discord.js';
import { modCommand } from '../../../lib/Util';
import ModBot from '../../../lib/ModBot';

export default class Unban extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'unban',
			description: 'Unban a user by id',
			usage: '<prefix>unban <user> <...reason>',
			group: 'mod',
			guildOnly: true
		});

		this.use(modCommand);

		const { resolveArgs, expect } = Middleware;
		this.use(resolveArgs({ '<user>': 'BannedUser', '<...reason>': 'String' }));
		this.use(expect({ '<user>': 'User', '<...reason>': 'String' }));
	}

	public async action(message: Message, [user, reason]: [User, string]): Promise<any>
	{
		const id: string = user.id;
		const unbanning: Message = <Message> await message.channel.send(
			`Unbanning ${user.username}#${user.discriminator}...`);

		try
		{
			this.bot.mod.actions.unban(id, message.guild);
			const unbanCase: Message = <Message> await this.bot.mod.logger.awaitBanCase(message.guild, user, 'Unban');
			this.bot.mod.logger.editCase(message.guild, unbanCase, message.author, reason);

			return unbanning.edit(`Successfully unbanned ${user.username}#${user.discriminator}`);
		}
		catch (err)
		{
			return unbanning.edit(`Failed to unban user with id \`${id}\``);
		}
	}
}
