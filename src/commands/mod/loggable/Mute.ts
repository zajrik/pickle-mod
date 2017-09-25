import { Command, Message, Middleware, CommandDecorators, Time } from 'yamdbf';
import { GuildMember, User } from 'discord.js';
import { ModClient } from '../../../lib/ModClient';
import { modOnly } from '../../../lib/Util';

const { resolve, expect } = Middleware;
const { using } = CommandDecorators;

export default class extends Command<ModClient>
{
	public constructor()
	{
		super({
			name: 'mute',
			desc: 'Mute a user',
			usage: '<prefix>mute <member> <duration> <...reason>',
			info: 'Uses duration shorthand to determine duration. Examples:\n\n\t30s\n\t10m\n\t5h\n\t1d',
			group: 'mod',
			guildOnly: true
		});
	}

	@modOnly
	@using(resolve('member: Member, duration: Duration, ...reason: String'))
	@using(expect('member: Member, duration: Number, ...reason: String'))
	public async action(message: Message, [member, duration, reason]: [GuildMember, number, string]): Promise<any>
	{
		if (this.client.mod.actions.isLocked(message.guild, member.user))
			return message.channel.send('That user is currently being moderated by someone else');

		this.client.mod.actions.setLock(message.guild, member.user);
		try
		{
			if (!await this.client.mod.hasSetMutedRole(message.guild)) return message.channel.send(
				`This server doesn't have a role set for muting.`);

			const user: User = member.user;
			if (user.id === message.author.id)
				return message.channel.send(`I don't think you want to mute yourself.`);

			const modRole: string = await message.guild.storage.settings.get('modrole');
			if ((member && member.roles.has(modRole)) || user.id === message.guild.ownerID || user.bot)
				return message.channel.send('You may not use this command on that user.');

			const mutedRole: string = await message.guild.storage.settings.get('mutedrole');
			if (member.roles.has(mutedRole))
				return message.channel.send(`That user is already muted`);

			const muting: Message = <Message> await message.channel.send(`Muting ${user.tag}...`);

			let muteCase: Message;
			try { muteCase = <Message> await this.client.mod.logs.awaitMuteCase(message.guild, member); }
			catch (err) { return muting.edit(`Error while muting: ${err}`); }

			await this.client.mod.actions.setMuteDuration(member, message.guild, duration);
			await this.client.mod.logs.editCase(
				message.guild, muteCase, message.author, reason, Time.duration(duration).toSimplifiedString());

			return muting.edit(`Muted ${user.tag}`);
		}
		finally { this.client.mod.actions.removeLock(message.guild, member.user); }
	}
}
