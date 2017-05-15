import { Command, Message, Middleware } from 'yamdbf';
import { User, RichEmbed, GuildMember } from 'discord.js';
import { prompt, PromptResult } from '../../lib/Util';
import ModBot from '../../lib/ModBot';

export default class History extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'history',
			description: 'Check a member\'s offense history',
			usage: '<prefix>history [member] [\'reset\']',
			extraHelp: `To reset a member's history, just add the word 'reset' after the member to look up. If no member is provided, or you do not have permission to use mod commands, you will be DM'd your own history.`,
			group: 'mod',
			guildOnly: true
		});

		this.use((message, args) => {
			if (!this.client.mod.canCallModCommand(message)) return [message, []];
			else return Middleware.resolveArgs({ '<member>': 'Member' }).call(this, message, args);
		});
	}

	public async action(message: Message, [member, reset]: [GuildMember, string]): Promise<any>
	{
		const user: User = member ? member.user : message.author;
		let offenses: any = await this.client.mod.actions.checkUserHistory(message.guild, user);
		let embed: RichEmbed = new RichEmbed()
			.setColor(offenses.color)
			.setAuthor(`${user.username}#${user.discriminator}`, user.avatarURL)
			.setFooter(offenses.toString());

		if (!member) return message.author.sendEmbed(embed);

		if (reset === 'reset')
		{
			if (!message.member.permissions.has('MANAGE_GUILD'))
				return message.channel.send(`You don't have permission to reset member history.`);

			const [result]: [PromptResult] = <[PromptResult]> await prompt(message,
				'Are you sure you want to reset this member\'s history? (__y__es | __n__o)',
				/^(?:yes|y)$/i, /^(?:no|n)$/i, { embed });
			if (result === PromptResult.TIMEOUT) return message.channel.send('Command timed out, aborting history reset.');
			if (result === PromptResult.FAILURE) return message.channel.send('Okay, aborting history reset.');

			await this.client.mod.managers.history.clear(user, message.guild);

			offenses = await this.client.mod.actions.checkUserHistory(message.guild, user);
			embed = new RichEmbed()
				.setColor(offenses.color)
				.setAuthor(`${user.username}#${user.discriminator}`, user.avatarURL)
				.setFooter(offenses.toString());
		}

		message.channel.sendEmbed(embed);
	}
}
