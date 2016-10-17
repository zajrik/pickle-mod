let Command = require('yamdbf').Command;

exports.default = class Invite extends Command
{
	constructor(bot)
	{
		super(bot, {
			name: 'invite',
			aliases: [],
			description: 'Get an invite link to add me to a server',
			usage: '<prefix>invite',
			extraHelp: '',
			group: 'base'
		});
	}

	action(message, args, mentions, original) // eslint-disable-line no-unused-vars
	{
		message.channel.sendMessage(`You can invite me to your server with this link:\nhttps://discordapp.com/oauth2/authorize?client_id=235221760520224769&scope=bot&permissions=1573252151\n\nAfter adding me to your server, I will send you a DM with instructions to prepare your server for moderation. Thanks for choosing YAMDBF Mod for your server moderation control needs! 👏`);
	}
};
