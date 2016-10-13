let Command = require('yamdbf').Command;

exports.default = class Approve extends Command
{
	constructor(bot)
	{
		super(bot, {
			name: 'approve',
			aliases: [],
			description: 'Approve a ban appeal',
			usage: '<prefix>approve <appeal id>',
			extraHelp: '',
			group: 'mod',
			guildOnly: true,
			stringArgs: true,
			permissions: [],
			roles: ['Mod']
		});
	}

	action(message, args, mentions, original) // eslint-disable-line no-unused-vars
	{
		if (message.channel.name !== 'ban-appeals')
		{
			message.delete();
			message.channel.sendMessage(`Approve command may only be run in #ban-appeals`)
				.then(response => response.delete(5000));
			return;
		}
		let id = args[0].toString();
		if (!id)
		{
			message.delete();
			message.channel.sendMessage(`You must provide an appeal ID to approve.`)
				.then(response => response.delete(5000));
			return;
		}
		let storage = this.bot.storage;
		let appeal = storage.getItem('activeAppeals')[id];
		if (!appeal)
		{
			message.delete();
			message.channel.sendMessage(`Could not find an appeal with that ID.`)
				.then(response => response.delete(5000));
			return;
		}
		this.bot.mod.unban(id, message.guild)
			.then(user =>
			{
				message.delete();
				message.channel.sendMessage(`Approved appeal \`${id}\`. Unbanned ${user.username}#${user.discriminator}`)
					.then(response => response.delete(5000));
				message.guild.defaultChannel.createInvite({ maxAge: 72 * 1000 * 60 * 60, maxUses: 1 })
					.then(invite =>
					{
						user.sendMessage(`Your appeal has been approved. You have been unbanned from ${message.guild.name}. You may rejoin using this invite:\n${invite.url}`);
					});
				while(storage.getItem('checkingBans')) {} // eslint-disable-line
				storage.setItem('checkingBans', true);
				let activeBans = storage.getItem('activeBans');
				if (!activeBans) activeBans = {};
				let bans = activeBans[user.id];
				bans.forEach((ban, index) =>
				{
					if (ban.guild === message.guild.id) bans.splice(index, 1);
				});
				if (bans.length === 0) delete activeBans[user.id];
				else activeBans[user.id] = bans;
				storage.setItem('activeBans', activeBans);
				storage.setItem('checkingBans', false);

				while (storage.getItem('checkingAppeals')) {} // eslint-disable-line
				storage.setItem('checkingAppeals', true);
				let activeAppeals = storage.getItem('activeAppeals');
				if (!activeAppeals) activeAppeals = {};
				message.channel.fetchMessage(activeAppeals[user.id])
					.then(msg => msg.delete()).catch(console.log);
				delete activeAppeals[user.id];
				storage.setItem('activeAppeals', activeAppeals);
				storage.setItem('checkingAppeals', false);
				console.log(`Unbanned user '${user.username}#${user.discriminator}'`);
			})
			.catch(err =>
			{
				storage.setItem('checkingBans', false);
				storage.setItem('checkingAppeals', false);
				console.log(err);
			});
	}
};
