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
			usage: '<prefix>unban <id>',
			extraHelp: '',
			argOpts: { stringArgs: true },
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return;
		const id: string = <string> args[0];
		if (!id) return message.channel.send('You must provide an ID to unban.');

		let user: User;
		try
		{
			user = await this.bot.mod.actions.unban(id, message.guild);
			return message.channel.send(`Successfully unbanned ${user.username}#${user.discriminator}\n`
				+ `Remember to use \`${this.bot.getPrefix(message.guild)}reason latest <...reason>\` `
				+ `to set a reason for this unbanning.`);
		}
		catch (err)
		{
			return message.channel.send(`Failed to unban id \`${id}\``);
		}
	}
}
