let Command = require('yamdbf').Command;

exports.default = class Mute extends Command
{
	constructor(bot)
	{
		super(bot, {
			name: 'mute',
			aliases: [],
			description: 'Mute a user',
			usage: '<prefix>mute <@user> <reason>',
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
		let duration, p; // eslint-disable-line
		if (/^\d+[m|h|d]$/.test(args[0]))
		{
			p = args.shift().match(/^(\d+)(m|h|d)$/);
			p[1] = parseFloat(p[1]);
			duration = p[2] === 'm'
				? p[1] * 1000 * 60 : p[2] === 'h'
				? p[1] * 1000 * 60 * 60 : p[2] === 'd'
				? p[1] * 1000 * 60 * 60 * 24 : null;
		}
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
					p[0]))
			.then(() =>
			{
				user.sendMessage(`You have been muted on ${message.guild.name}.\n\`Duration:\` ${p[0]}\n\`Reason:\` ${reason}`);
				let storage = this.bot.storage;
				while(storage.getItem('checkingMutes')) {} // eslint-disable-line
				storage.setItem('checkingMutes', true);
				let activeMutes = storage.getItem('activeMutes');
				if (!activeMutes) activeMutes = {};
				activeMutes[user.id] = {
					user: user.id,
					raw: `${user.username}#${user.discriminator}`,
					timestamp: Date.parse(message.timestamp),
					duration: duration,
					guild: message.guild.id
				};
				storage.setItem('activeMutes', activeMutes);
				storage.setItem('checkingMutes', false);
				console.log(`Muted user '${user.username}#${user.discriminator}'`);
			})
			.catch(console.log);
	}
};
