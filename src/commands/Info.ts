import { Bot, Command, version, Message } from 'yamdbf';
import { User, RichEmbed, Guild } from 'discord.js';
import * as Discord from 'discord.js';
import Time from '../lib/Time';

export default class Info extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'info',
			aliases: [],
			description: 'Bot information',
			usage: '<prefix>info',
			extraHelp: '',
			group: 'base'
		});
	}

	public action(message: Message, args: Array<string | number>, mentions: User[], original: string): any
	{
		const embed: RichEmbed = new RichEmbed()
			.setColor(11854048)
			.setAuthor('YAMDBF Mod Info', this.bot.user.avatarURL)
			.addField('Mem Usage', `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, true)
			.addField('Uptime', Time.difference(this.bot.uptime * 2, this.bot.uptime).toString(), true)
			.addField('\u200b', '\u200b', true)
			.addField('Servers', this.bot.guilds.size.toString(), true)
			.addField('Channels', this.bot.channels.size.toString(), true)
			.addField('Users', this.bot.guilds.map((g: Guild) =>
				g.memberCount).reduce((a: number, b: number) => a + b), true)
			.addField('YAMDBF', `v${version}`, true)
			.addField('Discord.js', `v${Discord.version}`, true)
			.addField('\u200b', '\u200b', true)
			.addField('Modbot Source', '[Available on GitHub](https://github.com/zajrik/modbot)', true)
			.addField('YAMDBF Info', 'https://yamdbf.js.org', true)
			.addField('Bot Invite', `[Click here](https://discordapp.com/oauth2/authorize`
				+ `?permissions=490826759&scope=bot&client_id=${this.bot.user.id})`, true)
			.addField('\u200b', `Be sure to use the \`guide\` command for information `
				+ `on setting up your server for moderation! The default prefix for commands is \`?\`. `
				+ `You can change this with the \`setprefix\` command.\n\nIf you ever forget the command prefix, `
				+ `just use \`@${this.bot.user.username}#${this.bot.user.discriminator} prefix\`.`)
			.setFooter('YAMDBF', this.bot.user.avatarURL)
			.setTimestamp();

		message.channel.sendEmbed(embed);
	}
}
