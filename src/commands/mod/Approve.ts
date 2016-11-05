'use strict';
import { Bot, Command, LocalStorage } from 'yamdbf';
import { User, Message, TextChannel, Invite } from 'discord.js';
import { ActiveBans, BanObj, ActiveAppeals } from '../../lib/ModActions';
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
			roles: ['Mod']
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		message.delete();
		if ((<TextChannel> message.channel).name !== 'ban-appeals')
			return message.channel.sendMessage('Approve command may only be run in #ban-appeals')
				.then((res: Message) => res.delete(5000));

		const id: string = <string> args[0];
		if (!id) return message.channel.sendMessage('You must provide an appeal ID to approve.')
			.then((res: Message) => res.delete(5000));

		const storage: LocalStorage = this.bot.storage;
		const appeal = storage.getItem('activeAppeals')[id];
		if (!appeal) return message.channel.sendMessage('Could not find an appeal with that ID.')
			.then((res: Message) => res.delete(5000));

		const user: User = await (<ModBot> this.bot).mod.unban(id, message.guild);
		message.channel.sendMessage(`Approved appeal \`${id}\`. Unbanned ${user.username}#${user.discriminator}`)
			.then((res: Message) => res.delete(5000));
		const invite: Invite = await message.guild.defaultChannel
			.createInvite({ maxAge: 72 * 1000 * 60 * 60, maxUses: 1 });
		await user.sendMessage(`Your appeal has been approved. You have been unbanned from ${
			message.guild.name}. You may rejoin using this invite:\n${invite.url}`);

		await storage.nonConcurrentAccess('activeBans', (key: string) =>
		{
			const activeBans: ActiveBans = storage.getItem(key) || {};
			const bans: BanObj[] = activeBans[user.id];
			for (let i = 0; i < bans.length; i++)
			{
				if (bans[i].guild === message.guild.id) bans.splice(i--, 1);
			}
			if (bans.length === 0) delete activeBans[user.id];
			else activeBans[user.id] = bans;
			storage.setItem(key, activeBans);
		});

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
