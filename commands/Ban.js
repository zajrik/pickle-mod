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
						// Todo: follow through with ban
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
		this.bot.mod.ban(user, message.guild)
			.then(member => console.log(`Warned ${member.user.username}#${member.user.discriminator}: ${reason}`))
			.catch(console.log);
	}
};
