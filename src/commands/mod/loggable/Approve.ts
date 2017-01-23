import { Command, LocalStorage, Message } from 'yamdbf';
import { User, Invite } from 'discord.js';
import ModBot from '../../../lib/ModBot';

export default class Approve extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'approve',
			aliases: [],
			description: 'Approve an appeal',
			usage: '<prefix>approve <id>',
			extraHelp: '',
			group: 'mod',
			argOpts: { stringArgs: true },
			guildOnly: true
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return;
		const appealsChannel: string = message.guild.storage.getSetting('appeals');
		if (message.channel.id !== appealsChannel)
			return message.channel.send('Approve command may only be run in the appeals channel.');

		message.delete();
		const id: string = <string> args[0];
		if (!id) return message.channel.send('You must provide an appeal ID to approve.')
			.then((res: Message) => res.delete(5e3));

		const storage: LocalStorage = this.bot.storage;
		const appeal: string = storage.getItem('activeAppeals')[id];
		if (!appeal) return message.channel.send('Could not find an appeal with that ID.')
			.then((res: Message) => res.delete(5e3));

		const user: User = await this.bot.mod.actions.unban(id, message.guild);
		const unbanCase: Message = <Message> await this.bot.mod.logger.awaitBanCase(message.guild, user, 'Unban');
		this.bot.mod.logger.editCase(message.guild, unbanCase, message.author, 'Approved appeal');

		message.channel.send(`Approved appeal \`${id}\`. Unbanned ${user.username}#${user.discriminator}`)
			.then((res: Message) => res.delete(5e3));
		const invite: Invite = await message.guild.defaultChannel
			.createInvite({ maxAge: 72 * 1000 * 60 * 60, maxUses: 1 });
		await user.send(`Your appeal has been approved. You have been unbanned from ${
			message.guild.name}. You may rejoin using this invite:\n${invite.url}`);
	}
}
