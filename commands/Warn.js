let Command = require('yamdbf').Command;

exports.default = class Warn extends Command
{
	constructor(bot)
	{
		super(bot, {
			name: 'warn',
			aliases: [],
			description: 'Give a formal warning to a user',
			usage: '<prefix>warn <@user> <reason>',
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
			console.log('Warn aborted, no reason given');
			return;
		}
		this.bot.mod.warn(user, message.guild)
			.then(member => console.log(`Warned ${member.user.username}#${member.user.discriminator}: ${reason}`))
			.catch(console.log);
	}
};
