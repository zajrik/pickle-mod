'use strict';
import { Command } from 'yamdbf';
import { Message, User } from 'discord.js';
import ModBot from '../../lib/ModBot';

export default class Kick extends Command
{
	public constructor(bot)
	{
		super(bot, {
			name: 'init',
			aliases: [],
			description: 'Initialize roles and channels I need to operate',
			usage: '<prefix>init',
			extraHelp: `This command can be run again at any time if roles or channel permissions get messed up, like if I wasn't paying attention when a channel was created and I didn't add \`Muted\` role permissions to it, or the \`Mod\` role was removed by mistake.`,
			group: 'mod',
			guildOnly: true,
			permissions: ['MANAGE_GUILD']
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string)
	{
		message.delete();
		const response: Message = <Message> (await message.channel.sendMessage('Setting up the server...'));
		try
		{
			await (<ModBot> this.bot).mod.initGuild(message.guild);
			message.author.sendMessage(`I'm done setting up! Everything is ready for you to start using moderation commands on your server. I've created a role called \`'Mod'\` which you can assign to users that you want to be allowed to use moderation commands. If you already had a role of that name then I have left it unchanged and you can use that role to determine who can use moderation commands.\n\nI've also created two channels. \`mod-logs\` and \`ban-appeals\`. Whenever a moderation action is taken I will post information to the \`mod-logs\` channel.\n\nWhenever a user is banned I will give them information for appealing their ban. Should the user choose to appeal, I will post their appeal to the \`ban-appeals\` channel and a moderator can approve or reject it using \`?approve <id>\`/\`?reject <id>\`.`);
		}
		catch (err)
		{
			message.author.sendMessage(`There was an error setting up the server. Contact zajrik#2656 on YAMDBF Official and provide this error:\n${err.stack}`);
		}
		response.delete();
	}
};