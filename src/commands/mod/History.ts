'use strict';
import { Bot, Command } from 'yamdbf';
import { User, Message } from 'discord.js';
import ModBot from '../../lib/ModBot';

export default class History extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'history',
			aliases: [],
			description: 'Check a user\'s offense history',
			usage: '<prefix>history <@user>',
			extraHelp: '',
			group: 'mod'
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		const user: User = mentions[0];
		const offenses: any = (<ModBot> this.bot).mod.checkUserHistory(message.guild, user);
		const embed: any = {
			color: offenses.color,
			author: {
				name: `${user.username}#${user.discriminator}`,
				icon_url: user.avatarURL
			},
			footer: {
				text: offenses.toString()
			}
		};

		message.channel.sendMessage('', <any> { embed: embed });
	}
}
