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
							storage.nonConcurrentAccess('activeBans', key =>
							{
								let activeBans = storage.getItem(key);
								if (!activeBans) activeBans = {};
								let bans = activeBans[id];
								bans.forEach((ban, index) =>
								{
									if (ban.guild === message.guild.id) bans.splice(index, 1);
								});
								if (bans.length === 0) delete activeBans[id];
								else activeBans[id] = bans;
								storage.setItem(key, activeBans);
							})
							.then(() =>
								storage.nonConcurrentAccess('activeAppeals', key =>
								{
									let activeAppeals = storage.getItem(key);
									if (!activeAppeals) activeAppeals = {};
									message.channel.fetchMessage(activeAppeals[id])
										.then(appealMsg => appealMsg.delete()).catch(console.log); // eslint-disable-line
									delete activeAppeals[id];
									storage.setItem(key, activeAppeals);
								})
							)
							.then(() =>
							{
								message.delete();
								msg.delete();
								message.channel.sendMessage(`Rejected appeal \`${id}\`. This user will be unable to further appeal their ban.`)
								.then(re => re.delete(5000));
							})
							.catch(console.log);
						}
						catch (err)
						{
							console.log(err);
						}
						collector.stop('success');
						response.delete();
						return;
					}
					collector.stop('failure');
					response.delete();
				});

				collector.on('end', (collection, why) =>
				{
					if (why === 'time')
					{
						message.channel.sendMessage('Command timed out. Try again.').then(re =>
						{
							message.delete();
							msg.delete();
							re.delete(5 * 1000);
						});
					}
					else if (why === 'failure')
					{
						message.channel.sendMessage('Okay, aborting appeal rejection.').then(re =>
						{
							message.delete();
							msg.delete();
							re.delete(5 * 1000);
						});
					}
				});
			});
	}
};
