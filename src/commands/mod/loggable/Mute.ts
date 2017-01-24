import { Command, LocalStorage, Message } from 'yamdbf';
import { User, GuildMember } from 'discord.js';
import ModBot from '../../../lib/ModBot';
import Time from '../../../lib/Time';

export default class Mute extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'mute',
			description: 'Mute a user',
			usage: '<prefix>mute <@user> <duration> <reason>',
			extraHelp: 'Uses duration shorthand to determine duration. Examples:\n\n\t30s\n\t10m\n\t5h\n\t1d',
			argOpts: { stringArgs: true },
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, [], mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return;
		if (!this.bot.mod.hasSetMutedRole(message.guild)) return message.channel.send(
			`This server doesn't have a role set for muting.`);

		const args: string[] = original.split(' ').slice(1);
		const idRegex: RegExp = /^(?:<@!?)?(\d+)>?$/;
		if (!idRegex.test(args[0])) return message.channel.send(
			'You must mention a user or provide an ID to mute.');
		const id: string = args.shift().match(idRegex)[1];

		let user: User;
		try { user = await this.bot.fetchUser(id); }
		catch (err) { return message.channel.send('Failed to fetch a user with that ID.'); }

		if (user.id === message.author.id)
			return message.channel.send(`I don't think you want to mute yourself.`);

		let member: GuildMember;
		try { member = await message.guild.fetchMember(user); }
		catch (err) { return message.channel.send('Failed to fetch a member with that ID.'); }

		const modRole: string = message.guild.storage.getSetting('modrole');
		if ((member && member.roles.has(modRole)) || user.id === message.guild.ownerID || user.bot)
			return message.channel.send('You may not use this command on that user.');

		const durationString: string = args.shift();
		const duration: number = Time.parseShorthand(durationString);
		if (!duration) return message.channel.send('You must provide a duration. (example: `30m`, `1h`, `2d`)');

		const reason: string = args.join(' ').trim();
		if (!reason) return message.channel.send('You must provide a reason to mute that user.');

		const mutedRole: string = message.guild.storage.getSetting('mutedrole');
		if (member.roles.has(mutedRole))
			return message.channel.send(`That user is already muted`);

		const muting: Message = <Message> await message.channel.send(
			`Muting ${user.username}#${user.discriminator}...`);

		this.bot.mod.actions.mute(member, message.guild);
		let muteCase: Message = <Message> await this.bot.mod.logger.awaitMuteCase(message.guild, user);
		const durationSet: boolean = await this.bot.mod.actions.setMuteDuration(member, message.guild, duration);
		if (!durationSet) message.channel.send(`Failed to set duration for mute.`);
		this.bot.mod.logger.editCase(message.guild, muteCase, message.author, reason, durationString);

		return muting.edit(`Muted ${user.username}#${user.discriminator}`);
	}
}
