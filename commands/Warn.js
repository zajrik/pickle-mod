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
		if (user.id === message.author.id)
		{
			message.channel.sendMessage(`I don't think you want to warn yourself.`)
				.then(response =>
				{
					message.delete(5000);
					response.delete(5000);
				});
			return;
		}
		if (!reason)
		{
			message.channel.sendMessage('You must provide a reason to warn that user.')
				.then(response =>
				{
					message.delete(5000);
					response.delete(5000);
				});
			return;
		}
		message.delete();
		this.bot.mod.warn(user, message.guild)
			.then(() => this.bot.mod
				.caseLog(
					user,
					message.guild,
					'Warn',
					reason,
					message.author))
			.then(() =>
			{
				user.sendMessage(`You've received a warning on ${message.guild.name}.\n\`Reason:\` ${reason}`);
				console.log(`Warned ${user.username}#${user.discriminator}`);
			})
			.catch(console.log);
	}
};
