let Command = require('yamdbf').Command;

exports.default = class Mute extends Command
{
	constructor(bot)
	{
		super(bot, {
			name: 'mute',
			aliases: [],
			description: 'Mute a user',
			usage: '<prefix>mute <@user> [duration] <reason>',
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
		if (user.id === message.author.id)
		{
			return message.channel.sendMessage(`I don't think you want to mute yourself.`)
				.then(response =>
				{
					message.delete(5000);
					response.delete(5000);
				});
		}
		if (message.guild.members.get(user.id).roles.find('name', 'Mod') || user.id === message.guild.ownerID || user.bot)
		{
			return message.channel.sendMessage(`You may not use this command on that user.`)
				.then(response =>
				{
					message.delete(5000);
					response.delete(5000);
				});
		}
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
		else
		{
			p = [null];
		}
		let reason = args.join(' ');
		if (!reason)
		{
			return message.channel.sendMessage('You must provide a reason to mute that user.')
			.then(response =>
			{
				message.delete(5000);
				response.delete(5000);
			});
		}
		if (message.guild.members.get(user.id).roles.find('name', 'Muted'))
		{
			return message.channel.sendMessage(
				`User ${user.username}#${user.discriminator} is already muted.`)
					.then(response =>
					{
						message.delete(5000);
						response.delete(5000);
					});
		}
		let storage = this.bot.storage;
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
			{ // eslint-disable-line
				return storage.nonConcurrentAccess('activeMutes', key =>
				{
					let activeMutes = storage.getItem(key);
					if (!activeMutes) activeMutes = {};
					if (!activeMutes[user.id]) activeMutes[user.id] = [];
					activeMutes[user.id].push({
						raw: `${user.username}#${user.discriminator}`,
						user: user.id,
						guild: message.guild.id,
						duration: duration,
						timestamp: Date.parse(message.timestamp)
					});
					storage.setItem(key, activeMutes);
					console.log(`Muted user '${user.username}#${user.discriminator}'`);
				});
			})
			.then(() =>
			{
				message.delete();
				message.channel.sendMessage(`Muted ${user.username}#${user.discriminator}`)
					.then(response => response.delete(5000));
			})
			.catch(console.log);
	}
};
