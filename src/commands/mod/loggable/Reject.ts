import { User } from 'discord.js';
import { Command, ClientStorage, Message } from 'yamdbf';
import { prompt, PromptResult, modOnly } from '../../../lib/Util';
import ModBot from '../../../lib/ModBot';

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
			guildOnly: true
		});
	}

	@modOnly
	public async action(message: Message, args: string[]): Promise<any>
	{
		const appealsChannel: string = await message.guild.storage.settings.get('appeals');
		if (message.channel.id !== appealsChannel)
			return message.channel.send('Reject command may only be run in the appeals channel.');

		const id: string = <string> args.shift();
		if (!id) return message.channel.send('You must provide an appeal ID to reject.')
			.then((res: Message) => res.delete(5e3));

		const storage: ClientStorage = this.client.storage;
		const appeal: string = (await storage.get('activeAppeals'))[id];
		if (!appeal) return message.channel.send('Could not find an appeal with that ID.')
			.then((res: Message) => res.delete(5e3));

		const reason: string = args.join(' ');
		if (!reason) return message.channel.send('You must provide a reason for this rejection.')
			.then((res: Message) => res.delete(5e3));

		const [result, ask, confirmation]: [PromptResult, Message, Message] = await prompt(message,
			`Are you sure you want to reject appeal \`${id}\` with this reason? (__y__es | __n__o)`,
			/^(?:yes|y)$/i, /^(?:no|n)$/i);

		if (result === PromptResult.TIMEOUT)
			return message.channel.send('Command timed out, aborting reject.')
				.then((res: Message) => res.delete(5e3))
				.then(() => ask.delete())
				.then(() => message.delete());

		if (result === PromptResult.FAILURE)
			return message.channel.send('Okay, aborting reject.')
				.then((res: Message) => res.delete(5e3))
				.then(() => ask.delete())
				.then(() => confirmation.delete())
				.then(() => message.delete());

		const user: User = await this.client.fetchUser(id);

		const activeBans: ActiveBans = await storage.get('activeBans') || {};
		const bans: BanObject[] = activeBans[user.id] || [];
		for (let i: number = 0; i < bans.length; i++)
		{
			if (bans[i].guild === message.guild.id) bans.splice(i--, 1);
		}
		if (bans.length === 0) delete activeBans[user.id];
		else activeBans[user.id] = bans;
		await storage.set('activeBans', activeBans);

		const activeAppeals: ActiveAppeals = await storage.get('activeAppeals') || {};
		if (activeAppeals[user.id])
		{
			message.channel.fetchMessage(activeAppeals[user.id])
				.then((msg: Message) => msg.delete()).catch(console.log);
			await storage.remove(`activeAppeals.${user.id}`);
		}

		message.channel.send(`Rejected appeal \`${id}\``)
			.then((res: Message) => res.delete(5000))
			.then(() => ask.delete())
			.then(() => confirmation.delete())
			.then(() => message.delete());

		user.send(`Your ban appeal for ${
			message.guild.name} has been rejected. You may not appeal again.\n\nReason: ${reason}`);
	}
}
