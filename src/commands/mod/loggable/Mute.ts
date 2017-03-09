import Time from '../../../lib/Time';
import { modCommand } from '../../../lib/Util';
import { GuildMember, User } from 'discord.js';
import { Command, Message, Middleware } from 'yamdbf';
import ModBot from '../../../lib/ModBot';

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

		this.use(modCommand);

		const { resolveArgs, expect } = Middleware;
		this.use(resolveArgs({ '<member>': 'Member', '<duration>': 'Duration', '<...reason>': 'String' }));
		this.use(expect({ '<member>': 'Member', '<duration>': 'Number', '<...reason>': 'String' }));
	}

	public async action(message: Message, [member, duration, reason]: [GuildMember, number, string]): Promise<any>
	{
		if (!this.bot.mod.hasSetMutedRole(message.guild)) return message.channel.send(
			`This server doesn't have a role set for muting.`);

		const user: User = member.user;
		if (user.id === message.author.id)
			return message.channel.send(`I don't think you want to mute yourself.`);

		const modRole: string = message.guild.storage.getSetting('modrole');
		if ((member && member.roles.has(modRole)) || user.id === message.guild.ownerID || user.bot)
			return message.channel.send('You may not use this command on that user.');

		const mutedRole: string = message.guild.storage.getSetting('mutedrole');
		if (member.roles.has(mutedRole))
			return message.channel.send(`That user is already muted`);

		const muting: Message = <Message> await message.channel.send(
			`Muting ${user.username}#${user.discriminator}...`);

		this.bot.mod.actions.mute(member, message.guild);
		let muteCase: Message = <Message> await this.bot.mod.logger.awaitMuteCase(message.guild, user);
		await this.bot.mod.actions.setMuteDuration(member, message.guild, duration);
		await this.bot.mod.logger.editCase(message.guild, muteCase, message.author, reason, Time.duration(duration).toSimplifiedString());

		return muting.edit(`Muted ${user.username}#${user.discriminator}`);
	}
}
