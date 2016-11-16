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
			group: 'mod',
			roles: ['Mod']
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		const user: User = mentions[0];
		const embed: any = {
			color: 16718080,
			author: {
				name: `${user.username}#${user.discriminator}`,
				icon_url: user.avatarURL
			},
			footer: {
				text: (<ModBot> this.bot).mod.checkUserHistory(message.guild, user)
			}
		};

		message.channel.sendMessage('', <any> { embed: embed });
	}
}
