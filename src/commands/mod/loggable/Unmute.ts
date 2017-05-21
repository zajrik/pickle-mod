import { Command, Message, Middleware, CommandDecorators } from 'yamdbf';
import { User, GuildMember } from 'discord.js';
import { ModClient } from '../../../lib/ModClient';
import { modOnly } from '../../../lib/Util';

const { resolveArgs, expect } = Middleware;
const { using } = CommandDecorators;

export default class extends Command<ModClient>
{
	public constructor(client: ModClient)
	{
		super(client, {
			name: 'unmute',
			description: 'Unmute a user',
			usage: '<prefix>unmute <member>',
			extraHelp: '',
			group: 'mod',
			guildOnly: true
		});
	}

	@modOnly
	@using(resolveArgs({ '<member>': 'Member' }))
	@using(expect({ '<member>': 'Member' }))
	public async action(message: Message, [member]: [GuildMember]): Promise<any>
	{
		if (!await this.client.mod.hasSetMutedRole(message.guild)) return message.channel.send(
			`This server doesn't have a role set for muting.`);

		const mutedRole: string = await message.guild.storage.settings.get('mutedrole');
		if (!member.roles.has(mutedRole)) return message.channel.send(`That user is not muted`);

		const user: User = member.user;
		const unmuting: Message = <Message> await message.channel.send(`Unmuting ${user.tag}...`);

		try
		{
			await this.client.mod.actions.unmute(member, message.guild);
			await this.client.mod.managers.mute.remove(member);
			user.send(`You have been unmuted on ${message.guild.name}. You may now send messages.`);
			return unmuting.edit(`Unmuted ${user.tag}`);
		}
		catch (err)
		{
			return message.channel.send(`There was an error while unmuting the user:\n${err}`);
		}
	}
}
