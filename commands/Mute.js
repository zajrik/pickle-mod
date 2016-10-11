let Command = require('yamdbf').Command;

exports.default = class Mute extends Command
{
	constructor(bot)
	{
		super(bot, {
			name: 'mute',
			aliases: [],
			description: 'Mute a user',
			usage: '<prefix>mute <@user>',
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
			console.log('Mute aborted, no reason given');
			return;
		}
		if (message.guild.members.get(user.id).roles.find('name', 'Muted'))
		{
			console.log(`User ${user.username}#${user.discriminator} is already muted.`);
			return;
		}
		this.bot.mod.mute(user, message.guild)
			.then(member => console.log(`Muted ${member.user.username}#${member.user.discriminator}: ${reason}`))
			.catch(console.log);
	}
};
