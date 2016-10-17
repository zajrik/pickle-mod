let Command = require('yamdbf').Command;

exports.default = class Kick extends Command
{
	constructor(bot)
	{
		super(bot, {
			name: 'kick',
			aliases: [],
			description: 'Kick a user',
			usage: '<prefix>kick <@user> <reason>',
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
		if (user.id === message.author.id)
		{
			message.channel.sendMessage(`I don't think you want to kick yourself.`)
				.then(response =>
				{
					message.delete(5000);
					response.delete(5000);
				});
			return;
		}
		if (message.guild.members.get(user.id).roles.find('name', 'Mod') || user.id === message.guild.ownerID || user.bot)
		{
			message.channel.sendMessage(`You may not use this command on that user.`)
				.then(response =>
				{
					message.delete(5000);
					response.delete(5000);
				});
			return;
		}
		if (!reason)
		{
			message.channel.sendMessage('You must provide a reason to kick that user.')
				.then(response =>
				{
					message.delete(5000);
					response.delete(5000);
				});
			return;
		}
		message.delete();
		this.bot.mod.kick(user, message.guild)
			.then(member => this.bot.mod
				.caseLog(
					member.user,
					message.guild,
					'Kick',
					reason,
					message.author))
			.catch(console.log);
		message.channel.sendMessage(`Kicked ${user.username}#${user.discriminator}`)
			.then(response => response.delete(5000));
	}
};
