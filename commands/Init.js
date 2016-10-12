let Command = require('yamdbf').Command;

exports.default = class Kick extends Command
{
	constructor(bot)
	{
		super(bot, {
			name: 'init',
			aliases: [],
			description: 'Initialize roles and channels the bot needs',
			usage: '<prefix>init',
			extraHelp: '',
			group: 'mod',
			guildOnly: true,
			permissions: ['MANAGE_GUILD'],
			roles: []
		});
	}

	action(message, args, mentions, original) // eslint-disable-line no-unused-vars
	{
		message.delete();
		this.bot.mod.initGuild(message.guild).then(() =>
		{
			message.author.sendMessage(`I'm done setting up! Everything is ready for you to start using moderation commands on your server. I've created a role called \`'Mod'\` which you can assign to users that you want to be allowed to use moderation commands. If you already had a role of that name then I have left it unchanged and you can use that role to determine who can use moderation commands.\n\nI've also created two channels. \`mod-logs\` and \`ban-appeals\`. Whenever a moderation action is taken I will post information to the \`mod-logs\` channel.\n\nWhenever a user is banned I will give them information for appealing their ban. Should the user choose to appeal, I will post their appeal to the \`ban-appeals\` channel and a moderator can approve or reject it using \`?approve <id>\`/\`?reject <id>\`.`);
		});
	}
};
