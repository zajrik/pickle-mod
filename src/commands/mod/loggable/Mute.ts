import Time from '../../../lib/Time';
import { modOnly } from '../../../lib/Util';
import { GuildMember, User } from 'discord.js';
import { Command, Message, Middleware, CommandDecorators } from 'yamdbf';
import ModBot from '../../../lib/ModBot';

const { resolveArgs, expect } = Middleware;
const { using } = CommandDecorators;

export default class Mute extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'mute',
			description: 'Mute a user',
			usage: '<prefix>mute <member> <duration> <...reason>',
			extraHelp: 'Uses duration shorthand to determine duration. Examples:\n\n\t30s\n\t10m\n\t5h\n\t1d',
			group: 'mod',
			guildOnly: true
		});
	}

	@modOnly
	@using(resolveArgs({ '<member>': 'Member', '<duration>': 'Duration', '<...reason>': 'String' }))
	@using(expect({ '<member>': 'Member', '<duration>': 'Number', '<...reason>': 'String' }))
	public async action(message: Message, [member, duration, reason]: [GuildMember, number, string]): Promise<any>
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

		const muting: Message = <Message> await message.channel.send(
			`Muting ${user.username}#${user.discriminator}...`);

		this.client.mod.actions.mute(member, message.guild);
		let muteCase: Message = <Message> await this.client.mod.logger.awaitMuteCase(message.guild, user);
		await this.client.mod.actions.setMuteDuration(member, message.guild, duration);
		await this.client.mod.logger.editCase(
			message.guild, muteCase, message.author, reason, Time.duration(duration).toSimplifiedString());

		return muting.edit(`Muted ${user.username}#${user.discriminator}`);
	}
}
