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
		if (!mentions[0]) return false;
		let user = mentions[0];
		let duration;
		if (!isNaN(args[0])) duration = args.shift();
		let reason = args.join(' ');
		if (!reason) return message.channel.sendMessage('You must provide a reason to mute that user.');
		if (message.guild.members.get(user.id).roles.find('name', 'Muted'))
		{
			return message.channel.sendMessage(
				`User ${user.username}#${user.discriminator} is already muted.`);
		}
		return this.bot.mod.mute(user, message.guild)
			.then(member => this.bot.mod
				.caseLog(
					member.user,
					message.guild,
					'Mute',
					reason,
					message.author,
					duration))
			.then(() =>
			{
				let storage = this.bot.storage;
				let activeMutes = storage.getItem('activeMutes');
				if (!activeMutes) activeMutes = {};
				activeMutes[user.id] = {
					user: user.id,
					timestamp: Date.parse(message.timestamp),
					duration: duration,
					guild: message.guild.id
				};
				storage.setItem('activeMutes', activeMutes);
				console.log(`Muted user '${user.id}'`);
			})
			.catch(console.log);
	}
};
