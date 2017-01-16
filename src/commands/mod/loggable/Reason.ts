import { Command, Message } from 'yamdbf';
import { User, MessageEmbed } from 'discord.js';
import ModBot from '../../../lib/ModBot';

export default class Reason extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'reason',
			aliases: [],
			description: 'Set a reason for a case',
			usage: '<prefix>reason <#|#-#|latest> <...reason>',
			extraHelp: 'Can be used to edit your own cases or to set a reason for a ban/unban case that was posted by the bot',
			group: 'mod',
			guildOnly: true,
			argOpts: { stringArgs: true }
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return;
		const parseRange: RegExp = /(\d+)\-(\d+)/;
		let firstID: int;
		let secondID: int;

		if (parseRange.test(<string> args[0]))
		{
			const parsedRange: RegExpMatchArray = (<string> args.shift()).match(parseRange);
			firstID = parseInt(parsedRange[1]);
			secondID = parseInt(parsedRange[2]);
		}
		else if (<string> args[0] === 'latest')
		{
			firstID = message.guild.storage.getSetting('cases');
			secondID = firstID;
			args.splice(0, 1);
		}
		else
		{
			firstID = parseInt(<string> args.shift());
			secondID = firstID;
		}
		if (!firstID || isNaN(firstID)) return message.channel.send('You must provide a case number.');
		if (secondID < firstID) return message.channel.send('Upper range cannot be below lower range.');

		const reason: string = args.join(' ');
		if (!reason) return message.channel.send('You must provide a reason to set.');

		const working: Message = <Message> await message.channel.send('Indexing cases...');

		const cases: Map<int, Message> = new Map();
		const errors: Map<int, string> = new Map();
		for (let i: int = firstID; i <= secondID; i++)
		{
			const caseMessage: Message = await this.bot.mod.logger.findCase(message.guild, i);
			if (!caseMessage)
			{
				errors.set(i, 'Failed to fetch case.');
				continue;
			}
			if (caseMessage.author.id !== this.bot.user.id)
			{
				errors.set(i, `I didn't post that case.`);
				continue;
			}

			const messageEmbed: MessageEmbed = caseMessage.embeds[0];
			if (messageEmbed.author.name !== `${message.author.username}#${message.author.discriminator}`
				&& messageEmbed.author.name !== `${this.bot.user.username}#${this.bot.user.discriminator}`)
				errors.set(i, 'That is not your case to edit.');

			cases.set(i, caseMessage);
		}

		if (errors.size > 0)
		{
			const errorMsgs: string[] = Array.from(errors.entries())
				.map((e => `**Case ${e[0]}:** ${e[1]}`));
			let errorOutput: string;
			if (errorMsgs.length > 10) errorOutput =
				`${errorMsgs.slice(0, 10).join('\n')}\n-- Plus ${errorMsgs.length - 10} other errors.`;
			else errorOutput = errorMsgs.join('\n');
			return working.edit(`Unable to complete operation due to errors:\n${errorOutput}`);
		}

		await working.edit('Updating cases...');
		for (const caseNum of cases.keys())
			await this.bot.mod.logger.editCase(message.guild, caseNum, message.author, reason);

		if (firstID < secondID)	working.edit(`Set reason for cases #${firstID}-${secondID}.`);
		else working.edit(`Set reason for case #${firstID}.`);
	}
}
