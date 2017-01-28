'use strict';
import { Command, Message, GuildStorage } from 'yamdbf';
import { User, TextChannel } from 'discord.js';
import ModBot from '../../lib/ModBot';

export default class Fixcases extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'fixcases',
			description: 'Re-index case numbers',
			usage: '<prefix>fixcases <case msg id>',
			extraHelp: 'Must be given the message ID of a case that is known to have a correct number. All the cases after the provided case will be re-indexed in ascending order.',
			group: 'mod',
			guildOnly: true,
			argOpts: { stringArgs: true },
			ownerOnly: false
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return message.channel.send('uhhhh');

		if (!/\d+/.test(<string> args[0]))
			return message.channel.send('You must provide a valid case message ID.');

		const storage: GuildStorage = message.guild.storage;
		const logsChannel: TextChannel = <TextChannel> message.guild.channels
			.get(storage.getSetting('modlogs'));
		if (!logsChannel) return message.channel.send('This guild does not have a logs channel.');

		const caseRegex: RegExp = /Case (\d+)/;
		let startCase: Message;
		try
		{
			startCase = await logsChannel.fetchMessage(<string> args[0]);
		}
		catch (err)
		{
			return message.channel.sendMessage('Failed to fetch the provided case.');
		}
		if (!startCase.embeds[0] || !caseRegex.test(startCase.embeds[0].footer.text))
			return message.channel.send(`Message with that ID was not a valid case.`);

		const caseNum: string = startCase.embeds[0].footer.text.match(caseRegex)[1];
		const working: Message = <Message> await message.channel.send(
			`Re-indexing cases, starting at #${caseNum}... *(This can take a while)*`);

		try { await this.bot.mod.logger.fixCases(startCase); }
		catch (err) { return working.edit(err); }

		working.edit('Finished re-indexing cases.');
	}
}
