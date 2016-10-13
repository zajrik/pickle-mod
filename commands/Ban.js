let Command = require('yamdbf').Command;

exports.default = class Ban extends Command
{
	constructor(bot)
	{
		super(bot, {
			name: 'ban',
			aliases: [],
			description: 'Ban a user',
			usage: '<prefix>ban <@user> <reason>',
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
		if (!reason)
		{
			console.log('Ban aborted, no reason given');
			return;
		}
		message.channel.sendMessage(`Are you sure you want to ban ${user.username}#${user.discriminator}? Reason:\n"${reason}"`)
			.then(msg =>
			{
				let collector = msg.channel.createCollector(m => // eslint-disable-line
					m.author.id === user.id, { time: 10000 });

				collector.on('message', response =>
				{
					if (/(?:yes|y)/.test(response.content))
					{
						this.bot.mod.ban(user, message.guild)
							.then(member => this.bot.mod
								.caseLog(
									member.user,
									message.guild,
									'Ban',
									reason,
									message.author))
							.then(() =>
							{
								user.sendMessage(`You have been banned ${message.guild.name}.\`Reason:\` ${reason}\n\nYou can appeal your ban by DMing me the command \`appeal <message>\` with a message detailing why you think you deserve to have your ban removed. You must send this command without a prefix or I won't recognize it. If you are currently banned from more than one server that I serve, you may only appeal the most recent ban until that appeal is approved or rejected.\n\nAfter you have sent your appeal it will be passed to the server moderators for review. You will be notified when your appeal has been approved or rejected.`);
								let storage = this.bot.storage;
								while(storage.getItem('checkingBans')) {} // eslint-disable-line
								storage.setItem('checkingBans', true);
								let activeBans = storage.getItem('activeBans');
								if (!activeBans) activeBans = {};
								activeBans[user.id] = [];
								activeBans[user.id].push({
									user: user.id,
									raw: `${user.username}#${user.discriminator}`,
									guild: message.guild.id,
									timestamp: message.timestamp
								});
								storage.setItem('activeBans', activeBans);
								storage.setItem('checkingBans', false);
								console.log(`Banned user '${user.username}#${user.discriminator}'`);
							})
							.catch(console.log);
						collector.stop('success');
					}
				});

				collector.on('end', (collection, why) =>
				{
					if (why === 'time')
					{
						message.channel.sendMessage('Command timed out. Try again.').then(re =>
						{
							re.delete(5 * 1000);
						});
					}
					message.delete();
				});
			});
	}
};
