import { RichEmbed, TextChannel } from 'discord.js';
import { Client, Command, Message } from 'yamdbf';

export default class extends Command<Client>
{
	public constructor()
	{
		super({
			name: 'guide',
			desc: 'Get a guide for setting up the modbot on a server',
			usage: '<prefix>guide',
			group: 'mod'
		});
	}

	public async action(message: Message, args: string[]): Promise<void>
	{
		if (message.channel.type !== 'dm'
			&& !(<TextChannel> message.channel).permissionsFor(message.member).hasPermission('MANAGE_GUILD')
			&& !this.client.owner.includes(message.author.id)) return;

		const prefix: string = message.guild ? await this.client.getPrefix(message.guild) : '<prefix>';

		const embed: RichEmbed = new RichEmbed()
			.setColor(11854048)
			.setAuthor(`${this.client.user.username} Setup Guide`, this.client.user.avatarURL)
			.setDescription(`In order to be able to use moderation commands on your server there `
				+ `are some steps you'll need to take. In all cases, if a valid value is not found `
				+ `for any of the config commands, you will be notified and can try again.`)
			.addField('Step 1: Mod role', `You will need to create a role to give to people who are `
				+ `allowed to use moderation commands. This role does not need any special permissions `
				+ `and can be called whatever you want.\n\nAfter you've created this role, call the `
				+ `following command:\n\`${prefix}config mod <role name>\``)
			.addField('Step 2: Logs channel', `I require a channel that I can post moderation logs to `
				+ `when any moderation actions are taken. Ideally this is a channel that anyone can read `
				+ `but only I can send messages in. This channel can be called whatever you want.\n\n`
				+ `After you've created this channel, call the following command:\n`
				+ `\`${prefix}config logs <channel name>\``)
			.addField('Step 3: Appeals channel', `In addition to the logs channel, I also need a channel `
				+ `in which I can post ban appeals from banned users. This should be a channel that only `
				+ `I and those with the moderation role you configured can see and send messages in.\n\n`
				+ `After you've created this channel, call the following command:\n`
				+ `\`${prefix}config appeals <channel name>\``)
			.addField('Optional Step: Mute role', `If you want to be able to use the mute command, a role `
				+ `must be created that I can assign to people who are to be muted. This role should `
				+ `have permission overwrites disallowing message sending by muted users for any channels `
				+ `muted users should not be allowed to speak in. This can include voice channels if you `
				+ `remove \`Speak\` permissions for the role.\n\nAfter this role is created, call the `
				+ `following command:\n\`${prefix}config mute <role name>\``)
			.addField('\u200b', 'At any time you can check if your server has these '
				+ `config options set with the command:\n\`${prefix}config status\``);

			message.channel.send({ embed });
	}
}
