import { Client, Command, version, Message } from 'yamdbf';
import { RichEmbed, Guild } from 'discord.js';
import * as Discord from 'discord.js';
import Time from '../lib/Time';

export default class Info extends Command<Client>
{
	public constructor(client: Client)
	{
		super(client, {
			name: 'info',
			aliases: [],
			description: 'Bot information',
			usage: '<prefix>info',
			extraHelp: '',
			group: 'base'
		});
	}

	public action(message: Message, args: string[]): void
	{
		const embed: RichEmbed = new RichEmbed()
			.setColor(11854048)
			.setAuthor('YAMDBF Mod Info', this.client.user.avatarURL)
			.addField('Mem Usage', `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, true)
			.addField('Uptime', Time.difference(this.client.uptime * 2, this.client.uptime).toString(), true)
			.addField('\u200b', '\u200b', true)
			.addField('Servers', this.client.guilds.size.toString(), true)
			.addField('Channels', this.client.channels.size.toString(), true)
			.addField('Users', this.client.guilds.map((g: Guild) =>
				g.memberCount).reduce((a: number, b: number) => a + b), true)
			.addField('YAMDBF', `v${version}`, true)
			.addField('Discord.js', `v${Discord.version}`, true)
			.addField('\u200b', '\u200b', true)
			.addField('Modbot Source', '[Available on GitHub](https://github.com/zajrik/modbot)', true)
			.addField('Modbot Support', '[Channel Invite](https://discord.gg/ZYZuKsW)', true)
			.addField('Bot Invite', `[Click here](https://discordapp.com/oauth2/authorize`
				+ `?permissions=297888791&scope=bot&client_id=${this.client.user.id})`, true)
			.addField('\u200b', `Be sure to use the \`guide\` command for information `
				+ `on setting up your server for moderation! The default prefix for commands is \`?\`. `
				+ `You can change this with the \`setprefix\` command.\n\nIf you ever forget the command prefix, `
				+ `just use \`@${this.client.user.username}#${this.client.user.discriminator} prefix\`.`)
			.setFooter('YAMDBF', this.client.user.avatarURL)
			.setTimestamp();

		message.channel.sendEmbed(embed);
	}
}
