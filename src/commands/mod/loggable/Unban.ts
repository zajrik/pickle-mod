import { Command, Message } from 'yamdbf';
import { User } from 'discord.js';
import ModBot from '../../../lib/ModBot';

export default class Unban extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'unban',
			aliases: [],
			description: 'Unban a user by id',
			usage: '<prefix>unban <id> <reason>',
			extraHelp: '',
			argOpts: { stringArgs: true },
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return;
		const id: string = <string> args.shift();
		if (!id) return message.channel.send('You must provide an ID to unban.');

		const reason: string = args.join(' ').trim();
		if (!reason) return message.channel.send('You must provide a reason to ban that user.');

		let user: User;
		const unbanning: Message = <Message> await message.channel.send(`Unbanning \`${id}\`...`);
		try
		{
			user = await this.bot.mod.actions.unban(id, message.guild);
			const unbanCase: Message = <Message> await this.bot.mod.logger.awaitCase(message.guild, user, 'Unban');
			this.bot.mod.logger.editCase(message.guild, unbanCase, message.author, reason);

			return unbanning.edit(`Successfully unbanned ${user.username}#${user.discriminator}`);
		}
		catch (err)
		{
			return unbanning.edit(`Failed to unban user with id \`${id}\``);
		}
	}
}
