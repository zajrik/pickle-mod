import { Command, Message } from 'yamdbf';
import { User, RichEmbed } from 'discord.js';
import ModBot from '../../lib/ModBot';

export default class History extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'history',
			aliases: [],
			description: 'Check a user\'s offense history',
			usage: '<prefix>history <@user>',
			extraHelp: '',
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return;
		const user: User = mentions[0];
		if (!user) return message.channel.send('You must mention a user to check.');

		if (args[0] === 'reset')
			for (const type of ['warnings', 'mutes', 'kicks', 'softbans', 'bans'])
				message.guild.storage.removeItem(`${type}/${user.id}`);

		const offenses: any = this.bot.mod.actions.checkUserHistory(message.guild, user);
		const embed: RichEmbed = new RichEmbed()
			.setColor(offenses.color)
			.setAuthor(`${user.username}#${user.discriminator}`, user.avatarURL)
			.setFooter(offenses.toString());
		message.channel.sendEmbed(embed);
	}
}
