let Command = require('yamdbf').Command;

exports.default = class Reject extends Command
{
	constructor(bot)
	{
		super(bot, {
			name: 'reject',
			aliases: [],
			description: 'Reject a ban appeal',
			usage: '<prefix>reject <appeal id>',
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
			message.channel.sendMessage(`Reject command may only be run in #ban-appeals`)
				.then(response => response.delete(5000));
			return;
		}
		let id = args[0].toString();
		if (!id)
		{
			message.delete();
			message.channel.sendMessage(`You must provide an appeal ID to reject.`)
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
		message.channel.sendMessage(`Are you sure you want to reject appeal \`${id}\`?`)
			.then(msg =>
			{
				let collector = message.channel.createCollector(m => // eslint-disable-line
					m.author.id === message.author.id, { time: 10000 });

				collector.on('message', (response) =>
				{
					if (/^(?:yes|y)$/.test(response.content))
					{
						try
						{
							this.bot.fetchUser(id).then(user =>
							{
								user.sendMessage(`Your ban appeal for ${message.guild.name} has been rejected. You may not appeal again.`);
							});
							while(storage.getItem('checkingBans')) {} // eslint-disable-line
							storage.setItem('checkingBans', true);
							let activeBans = storage.getItem('activeBans');
							if (!activeBans) activeBans = {};
							let bans = activeBans[id];
							bans.forEach((ban, index) =>
							{
								if (ban.guild === message.guild.id) bans.splice(index, 1);
							});
							if (bans.length === 0) delete activeBans[id];
							else activeBans[id] = bans;
							storage.setItem('activeBans', activeBans);
							storage.setItem('checkingBans', false);

							while (storage.getItem('checkingAppeals')) {} // eslint-disable-line
							storage.setItem('checkingAppeals', true);
							let activeAppeals = storage.getItem('activeAppeals');
							if (!activeAppeals) activeAppeals = {};
							message.channel.fetchMessage(activeAppeals[id])
								.then(appealMsg => appealMsg.delete()).catch(console.log);
							delete activeAppeals[id];
							storage.setItem('activeAppeals', activeAppeals);
							storage.setItem('checkingAppeals', false);
							message.delete();
							msg.delete();
							message.channel.sendMessage(`Rejected appeal \`${id}\`. This user will be unable to further appeal their ban.`)
								.then(re => re.delete(5000));
						}
						catch (err)
						{
							storage.setItem('checkingAppeals', false);
							console.log(err);
						}
						collector.stop('success');
						response.delete();
						return;
					}
					collector.stop('failure');
				});

				collector.on('end', (collection, why) =>
				{
					if (why === 'time')
					{
						message.channel.sendMessage('Command timed out. Try again.').then(re =>
						{
							msg.delete();
							re.delete(5 * 1000);
						});
					}
					else if (why === 'failure')
					{
						message.channel.sendMessage('Okay, aborting appeal rejection.').then(re =>
						{
							msg.delete();
							re.delete(5 * 1000);
						});
					}
				});
			});
	}
};
