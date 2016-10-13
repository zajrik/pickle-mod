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
		if (user.id === message.author.id)
		{
			message.channel.sendMessage(`I don't think you want to ban yourself.`)
				.then(response =>
				{
					message.delete(5000);
					response.delete(5000);
				});
			return;
		}
		else if (message.guild.members.get(user.id).roles.find('name', 'Mod') || user.id === message.guild.ownerID || user.bot)
		{
			message.channel.sendMessage(`You may not use this command on that user.`)
				.then(response =>
				{
					message.delete(5000);
					response.delete(5000);
				});
			return;
		}
		else if (!reason)
		{
			message.channel.sendMessage(`You must provide a reason to ban this user.`)
				.then(response => response.delete(5000));
			return;
		}
		message.channel.sendMessage(`Are you sure you want to ban ${user.username}#${user.discriminator}? Reason:\n"${reason}"`)
			.then(msg =>
			{
				let collector = message.channel.createCollector(m => // eslint-disable-line
					m.author.id === message.author.id, { time: 10000 });

				collector.on('message', (response) =>
				{
					if (/^(?:yes|y)$/.test(response.content))
					{
						user.sendMessage(`You have been banned from ${message.guild.name}.\n\`Reason:\` ${reason}\n\nYou can appeal your ban by DMing me the command \`appeal <message>\`, where \`'<message>'\` is a message detailing why you think you deserve to have your ban lifted. You must send this command without a prefix or I won't recognize it. If you are currently banned from more than one server that I serve, you may only appeal the most recent ban until that appeal is approved or rejected.\n\nAfter you have sent your appeal it will be passed to the server moderators for review. You will be notified when your appeal has been approved or rejected. If your appeal is rejected, you may not appeal again.\n\nIf you are unable to DM me because we do not have any mutual servers, you may use this invite to gain a mutual server and then DM me your appeal.\nhttps://discord.gg/TEXjY6e`)
							.then(() =>
							{
								let storage = this.bot.storage;
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
										message.channel.sendMessage(`Successfully banned ${user.username}#${user.discriminator}`)
											.then(re => re.delete(5000)); // eslint-disable-line
										message.delete();
										msg.delete();

										while(storage.getItem('checkingBans')) {} // eslint-disable-line
										storage.setItem('checkingBans', true);
										let activeBans = storage.getItem('activeBans');
										if (!activeBans) activeBans = {};
										if (!activeBans[user.id]) activeBans[user.id] = [];
										activeBans[user.id].push({
											user: user.id,
											raw: `${user.username}#${user.discriminator}`,
											guild: message.guild.id,
											reason: reason,
											timestamp: Date.parse(message.timestamp)
										});
										storage.setItem('activeBans', activeBans);
										storage.setItem('checkingBans', false);
										console.log(`Banned user '${user.username}#${user.discriminator}'`);
									})
									.catch(err =>
									{
										storage.setItem('checkingBans', false);
										console.log(err);
									});
							});


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
						message.channel.sendMessage('Okay, aborting ban.').then(re =>
						{
							msg.delete();
							re.delete(5 * 1000);
						});
					}
				});
			});
	}
};
