import { Command, Message, Middleware } from 'yamdbf';
import { User, GuildMember } from 'discord.js';
import ModBot from '../../../lib/ModBot';
import { modCommand } from '../../../lib/Util';

export default class Unmute extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'unmute',
			description: 'Unmute a user',
			usage: '<prefix>unmute <member>',
			extraHelp: '',
			group: 'mod',
			guildOnly: true
		});

		this.use(modCommand);

		const { resolveArgs, expect } = Middleware;
		this.use(resolveArgs({ '<member>': 'Member' }));
		this.use(expect({ '<member>': 'Member' }));
	}

	public async action(message: Message, [member]: [GuildMember]): Promise<any>
	{
		if (!this.bot.mod.hasSetMutedRole(message.guild)) return message.channel.send(
			`This server doesn't have a role set for muting.`);

		const mutedRole: string = message.guild.storage.getSetting('mutedrole');
		if (!member.roles.has(mutedRole)) return message.channel.send(`That user is not muted`);

		const user: User = member.user;
		const unmuting: Message = <Message> await message.channel.send(
			`Unmuting ${user.username}#${user.discriminator}...`);

		try
		{
			await this.bot.mod.actions.unmute(member, message.guild);
			this.bot.mod.managers.mute.remove(member);
			user.send(`You have been unmuted on ${message.guild.name}. You may now send messages.`);
			return unmuting.edit(`Unmuted ${user.username}#${user.discriminator}`);
		}
		catch (err)
		{
			return message.channel.send(`There was an error while unmuting the user:\n${err}`);
		}
	}
}
