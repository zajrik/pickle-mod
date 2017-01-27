import { Command, Message } from 'yamdbf';
import { User, RichEmbed } from 'discord.js';
import ModBot from '../../lib/ModBot';
import { parseArgs } from '../../lib/Util';

export default class History extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'history',
			description: 'Check a user\'s offense history',
			usage: '<prefix>history <@user|id> [reset]',
			extraHelp: `To reset a user's history, just add the word 'reset' after the user mention/id`,
			argOpts: { stringArgs: true },
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, [], mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return;

		const args: string[] = parseArgs(original);
		const idRegex: RegExp = /^(?:<@!?)?(\d+)>?$/;
		if (!idRegex.test(args[0])) return message.channel.send(
			'You must mention a user or provide an ID to check.');
		const id: string = args.shift().match(idRegex)[1];

		let user: User;
		try { user = await this.bot.fetchUser(id); }
		catch (err) { return message.channel.send('Failed to fetch a user with that ID.'); }

		if (args[0] === 'reset')
		{
			if (!message.member.hasPermission('MANAGE_GUILD'))
				return message.channel.send(`You don't have permission to reset member history.`);

			for (const type of ['warnings', 'mutes', 'kicks', 'softbans', 'bans'])
				message.guild.storage.removeItem(`${type}/${user.id}`);
		}

		const offenses: any = this.bot.mod.actions.checkUserHistory(message.guild, user);
		const embed: RichEmbed = new RichEmbed()
			.setColor(offenses.color)
			.setAuthor(`${user.username}#${user.discriminator}`, user.avatarURL)
			.setFooter(offenses.toString());
		message.channel.sendEmbed(embed);
	}
}
