import { Command, Message, Middleware } from 'yamdbf';
import { User, RichEmbed, GuildMember } from 'discord.js';
import ModBot from '../../lib/ModBot';
import { modCommand, prompt, PromptResult } from '../../lib/Util';

export default class History extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'history',
			description: 'Check a member\'s offense history',
			usage: '<prefix>history <member> [\'reset\']',
			extraHelp: `To reset a member's history, just add the word 'reset' after the member to look up`,
			group: 'mod',
			guildOnly: true
		});

		this.use(modCommand);
		this.use(Middleware.resolveArgs({ '<member>': 'Member' }));
		this.use(Middleware.expect({ '<member>': 'Member' }));
	}

	public async action(message: Message, [member, reset]: [GuildMember, string]): Promise<any>
	{
		let user: User = member.user;
		let offenses: any = this.bot.mod.actions.checkUserHistory(message.guild, user);
		let embed: RichEmbed = new RichEmbed()
			.setColor(offenses.color)
			.setAuthor(`${user.username}#${user.discriminator}`, user.avatarURL)
			.setFooter(offenses.toString());

		if (reset === 'reset')
		{
			if (!message.member.hasPermission('MANAGE_GUILD'))
				return message.channel.send(`You don't have permission to reset member history.`);

			const [result]: [PromptResult] = <[PromptResult]> await prompt(
				message, 'Are you sure you want to reset this member\'s history? (__y__es | __n__o)', /^(?:yes|y)$/i, { embed });
			if (result === PromptResult.TIMEOUT) return message.channel.send('Command timed out, aborting history reset.');
			if (result === PromptResult.FAILURE) return message.channel.send('Okay, aborting history reset.');

			for (const type of ['warnings', 'mutes', 'kicks', 'softbans', 'bans'])
				message.guild.storage.removeItem(`${type}/${user.id}`);

			offenses = this.bot.mod.actions.checkUserHistory(message.guild, user);
			embed = new RichEmbed()
				.setColor(offenses.color)
				.setAuthor(`${user.username}#${user.discriminator}`, user.avatarURL)
				.setFooter(offenses.toString());
		}

		message.channel.sendEmbed(embed);
	}
}
