import { Bot, Command, LocalStorage, Message } from 'yamdbf';
import { User } from 'discord.js';
import { ActiveBans, BanObj, ActiveAppeals } from '../../../lib/ModActions';
import ModBot from '../../../lib/ModBot';

export default class Reject extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'reject',
			aliases: [],
			description: 'Reject an appeal',
			usage: '<prefix>reject <id> <...reason>',
			extraHelp: '',
			group: 'mod',
			argOpts: { stringArgs: true },
			guildOnly: true
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!(<ModBot> this.bot).mod.canCallModCommand(message)) return;
		const appealsChannel: string = message.guild.storage.getSetting('appeals');
		if (message.channel.id !== appealsChannel)
			return message.channel.sendMessage('Reject command may only be run in the appeals channel.');

		const id: string = <string> args.shift();
		if (!id) return message.channel.sendMessage('You must provide an appeal ID to reject.')
			.then((res: Message) => res.delete(5e3));

		const storage: LocalStorage = this.bot.storage;
		const appeal: string = storage.getItem('activeAppeals')[id];
		if (!appeal) return message.channel.sendMessage('Could not find an appeal with that ID.')
			.then((res: Message) => res.delete(5e3));

		const reason: string = args.join(' ');
		if (!reason) return message.channel.sendMessage('You must provide a reason for this rejection.')
			.then((res: Message) => res.delete(5e3));

		const ask: Message = <Message> await message.channel.sendMessage(
			`Are you sure you want to reject appeal \`${id}\` with this reason? (__y__es|__n__o)`);
		const confirmation: Message = (await message.channel.awaitMessages((a: Message) =>
			a.author.id === message.author.id, { max: 1, time: 10000 })).first();

		if (!confirmation) return message.channel.sendMessage('Command timed out, aborting reject.')
			.then((res: Message) => res.delete(5e3)).then(<any> ask.delete());

		if (!/^(?:yes|y)$/.test(confirmation.content))
			return message.channel.sendMessage('Okay, aborting reject.')
				.then((res: Message) => res.delete(5e3))
				.then(() => ask.delete())
				.then(() => confirmation.delete());

		const user: User = await this.bot.fetchUser(id);
		await storage.nonConcurrentAccess('activeBans', (key: string) =>
		{
			const activeBans: ActiveBans = storage.getItem(key) || {};
			const bans: BanObj[] = activeBans[user.id];
			for (let i: number = 0; i < bans.length; i++)
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

		message.channel.sendMessage(`Rejected appeal \`${id}\``)
			.then((res: Message) => res.delete(5000))
			.then(<any> ask.delete())
			.then(<any> confirmation.delete());

		user.sendMessage(`Your ban appeal for ${
			message.guild.name} has been rejected. You may not appeal again.\n\nReason: ${reason}`);
	}
}
