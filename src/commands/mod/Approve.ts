import { Bot, Command, LocalStorage, Message } from 'yamdbf';
import { User, Invite } from 'discord.js';
import { ActiveAppeals } from '../../lib/ModActions';
import ModBot from '../../lib/ModBot';

export default class Approve extends Command
{
	public constructor(bot: Bot)
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
		if (!(<ModBot> this.bot).mod.canCallModCommand(message)) return;
		const appealsChannel: string = message.guild.storage.getItem('appeals');
		if (message.channel.id !== appealsChannel)
			return message.channel.sendMessage('Approve command may only be run in the appeals channel.')
				.then((res: Message) => res.delete(5e3));

		message.delete();
		const id: string = <string> args[0];
		if (!id) return message.channel.sendMessage('You must provide an appeal ID to approve.')
			.then((res: Message) => res.delete(5e3));

		const storage: LocalStorage = this.bot.storage;
		const appeal: string = storage.getItem('activeAppeals')[id];
		if (!appeal) return message.channel.sendMessage('Could not find an appeal with that ID.')
			.then((res: Message) => res.delete(5e3));

		const user: User = await (<ModBot> this.bot).mod.unban(id, message.guild);
		message.channel.sendMessage(`Approved appeal \`${id}\`. Unbanned ${user.username}#${user.discriminator}`)
			.then((res: Message) => res.delete(5e3));
		const invite: Invite = await message.guild.defaultChannel
			.createInvite({ maxAge: 72 * 1000 * 60 * 60, maxUses: 1 });
		await user.sendMessage(`Your appeal has been approved. You have been unbanned from ${
			message.guild.name}. You may rejoin using this invite:\n${invite.url}`);

		await storage.nonConcurrentAccess('activeAppeals', (key: string) =>
		{
			const activeAppeals: ActiveAppeals = storage.getItem(key) || {};
			message.channel.fetchMessage(activeAppeals[user.id])
				.then((msg: Message) => msg.delete()).catch(console.log);
			delete activeAppeals[user.id];
			storage.setItem(key, activeAppeals);
		});
	}
}
