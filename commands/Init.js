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
		this.bot.mod.initGuild(message.guild);
	}
};
