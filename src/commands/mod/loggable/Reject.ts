import { Command, LocalStorage, Message } from 'yamdbf';
import { User } from 'discord.js';
import ModBot from '../../../lib/ModBot';
import { prompt, PromptResult } from '../../../lib/Util';

export default class Reject extends Command<ModBot>
{
	public constructor(bot: ModBot)
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
		if (!this.bot.mod.canCallModCommand(message))
			return this.bot.mod.sendModError(message);

		const appealsChannel: string = message.guild.storage.getSetting('appeals');
		if (message.channel.id !== appealsChannel)
			return message.channel.send('Reject command may only be run in the appeals channel.');

		const id: string = <string> args.shift();
		if (!id) return message.channel.send('You must provide an appeal ID to reject.')
			.then((res: Message) => res.delete(5e3));

		const storage: LocalStorage = this.bot.storage;
		const appeal: string = storage.getItem('activeAppeals')[id];
		if (!appeal) return message.channel.send('Could not find an appeal with that ID.')
			.then((res: Message) => res.delete(5e3));

		const reason: string = args.join(' ');
		if (!reason) return message.channel.send('You must provide a reason for this rejection.')
			.then((res: Message) => res.delete(5e3));

		const [result, ask, confirmation]: [PromptResult, Message, Message] = await prompt(
			message, `Are you sure you want to reject appeal \`${id}\` with this reason? (__y__es|__n__o)`, /^(?:yes|y)$/i);

		if (result === PromptResult.TIMEOUT)
			return message.channel.send('Command timed out, aborting reject.')
				.then((res: Message) => res.delete(5e3))
				.then(<any> ask.delete());

		if (result === PromptResult.FAILURE)
			return message.channel.send('Okay, aborting reject.')
				.then((res: Message) => res.delete(5e3))
				.then(() => ask.delete())
				.then(() => confirmation.delete())
				.then(() => message.delete());

		const user: User = await this.bot.fetchUser(id);
		await storage.queue('activeBans', (key: string) =>
		{
			const activeBans: ActiveBans = storage.getItem(key) || {};
			const bans: BanObject[] = activeBans[user.id];
			for (let i: number = 0; i < bans.length; i++)
			{
				if (bans[i].guild === message.guild.id) bans.splice(i--, 1);
			}
			if (bans.length === 0) delete activeBans[user.id];
			else activeBans[user.id] = bans;
			storage.setItem(key, activeBans);
		});

		await storage.queue('activeAppeals', (key: string) =>
		{
			const activeAppeals: ActiveAppeals = storage.getItem(key) || {};
			message.channel.fetchMessage(activeAppeals[user.id])
				.then((msg: Message) => msg.delete()).catch(console.log);
			delete activeAppeals[user.id];
			storage.setItem(key, activeAppeals);
		});

		message.channel.send(`Rejected appeal \`${id}\``)
			.then((res: Message) => res.delete(5000))
			.then(<any> ask.delete())
			.then(<any> confirmation.delete())
			.then(() => message.delete());

		user.send(`Your ban appeal for ${
			message.guild.name} has been rejected. You may not appeal again.\n\nReason: ${reason}`);
	}
}
