let Command = require('yamdbf').Command;

exports.default = class Unmute extends Command
{
	constructor(bot)
	{
		super(bot, {
			name: 'unmute',
			aliases: [],
			description: 'Unmute a user',
			usage: '<prefix>unmute <@user>',
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
		if (!message.guild.members.get(user.id).roles.find('name', 'Muted'))
		{
			console.log(`User ${user.username}#${user.discriminator} is not muted.`);
			return;
		}
		this.bot.mod.unmute(user, message.guild)
			.then(member =>
			{
				while(storage.getItem('checkingMutes')) {} // eslint-disable-line
				let storage = this.bot.storage;
				let activeMutes = storage.getItem('activeMutes');
				delete activeMutes[member.user.id];
				storage.setItem('activeMutes', activeMutes);
				console.log(`Unmuted ${member.user.username}#${member.user.discriminator}`);
			})
			.catch(console.log);
	}
};
