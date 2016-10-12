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
			message.author.sendMessage(`I'm done setting up! Everything is ready for you to start using moderation commands on your server. I've attempted to create a role called 'Mod' which you can assign to users that you want to be allowed to use moderation commands. If you already had a role of that name then you can use that role to determine who can use moderation commands.`);
		});
	}
};
