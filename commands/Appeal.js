let Command = require('yamdbf').Command;

exports.default = class Appeal extends Command
{
	constructor(bot)
	{
		super(bot, {
			name: 'appeal',
			aliases: [],
			description: 'Appeal a ban',
			usage: '<prefix>appeal <message>',
			extraHelp: '',
			group: 'mod',
			guildOnly: false
		});
	}

	action(message, args, mentions, original) // eslint-disable-line no-unused-vars
	{
		try
		{
			if (message.channel.type !== 'dm') return;
			let storage = this.bot.storage;
			storage.nonConcurrentAccess('activeBans', key =>
			{
				let activeBans = storage.getItem(key);
				storage.nonConcurrentAccess('activeAppeals', appealsKey =>
				{
					let activeAppeals = storage.getItem(appealsKey);
					let ban = activeBans[message.author.id];
					if (!ban)
					{
						message.channel.sendMessage(`You do not have any bans eligible for appeal.`);
						return;
					}
					else if (activeAppeals && activeAppeals[message.author.id])
					{
						message.channel.sendMessage(`You currently have a pending appeal and may not place another until it has been reviewed.`);
						return;
					}
					ban = ban.slice(-1)[0];
					let reason = args.join(' ');
					if (!reason)
					{
						message.channel.sendMessage('You must provide an appeal message if you want to appeal a ban.');
						return;
					}
					let guild = this.bot.guilds.get(ban.guild);
					guild.channels.find('name', 'ban-appeals').sendMessage(``
						+ `\`------------------APPEAL------------------\`\n`
						+ `\`User:\` ${ban.raw}\n`
						+ `\`Reason for ban:\` ${ban.reason}\n\n`
						+ `\`Appeal message:\` ${reason}\n\n`
						+ `To approve this appeal, use \`${this.bot.getPrefix(guild)}approve ${ban.user}\`\n`
						+ `To reject this appeal, use \`${this.bot.getPrefix(guild)}reject ${ban.user}\`\n`
						+ `\`------------------------------------------\``
					)
					.then(appeal =>
					{
						if (!activeAppeals) activeAppeals = {};
						activeAppeals[message.author.id] = appeal.id;
						storage.setItem(appealsKey, activeAppeals);
						message.channel.sendMessage('Your appeal has been received. You will be notified when it is approved or rejected.');
					});
				});
			})
			.catch(console.log);
		}
		catch (err)
		{
			console.log(err);
		}
	}
};
