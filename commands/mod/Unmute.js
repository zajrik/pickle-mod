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
		let storage = this.bot.storage;
		this.bot.mod.unmute(user, message.guild)
			.then(member =>
			{
				storage.nonConcurrentAccess('activeMutes', key =>
				{
					let activeMutes = storage.getItem(key);
					activeMutes[member.user.id] = activeMutes[member.user.id]
						.filter(a => a.guild !== message.guild.id);
					storage.setItem(key, activeMutes);
					console.log(`Unmuted ${member.user.username}#${member.user.discriminator}`);
				});
			})
			.then(() =>
			{
				message.delete();
				message.channel.sendMessage(`Unmuted ${user.username}#${user.discriminator}`)
					.then(response => response.delete(5000));
				user.sendMessage(`You have been unmuted on ${message.guild.name}. You may now send messages.`);
			})
			.catch(console.log);
	}
};
