let Command = require('yamdbf').Command;

exports.default = class Kick extends Command
{
	constructor(bot)
	{
		super(bot, {
			name: 'kick',
			aliases: [],
			description: 'Kick a user',
			usage: '<prefix>kick <@user>',
			extraHelp: '',
			group: 'mod',
			guildOnly: true,
			permissions: [],
			roles: ['Mod']
		});
	}

	action(message, args, mentions, original) // eslint-disable-line no-unused-vars
	{
		if (!mentions[0]) return;
		let user = mentions[0];
		let reason = args.join(' ');
		if (!reason)
		{
			console.log('Kick aborted, no reason given');
			return;
		}
		this.bot.mod.kick(user, message.guild)
		.then(member => this.bot.mod
			.caseLog(
				member.user,
				message.guild,
				'Kick',
				reason,
				message.author))
			.catch(console.log);
	}
};
