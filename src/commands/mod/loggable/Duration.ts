import { Command, Message } from 'yamdbf';
import { User, GuildMember, MessageEmbed } from 'discord.js';
import ModBot from '../../../lib/ModBot';
import Time from '../../../lib/Time';

export default class Duration extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'duration',
			aliases: ['dur'],
			description: 'Set a duration for an active mute',
			usage: '<prefix>duration <case#> <duration>',
			extraHelp: 'This will restart a mute with an already set duration.',
			argOpts: { stringArgs: false },
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return;
		console.log(args);
		const caseNum: int = <int> args.shift();
		const durationString: string = <string> args.shift();
		const duration: int = Time.parseShorthand(durationString);
		if (!duration) return message.channel.send('You must provide a valid duration.');

		const caseMessage: Message = await this.bot.mod.logger.findCase(message.guild, caseNum);
		if (!caseMessage) return message.channel.send('Failed to fetch case.');
		if (caseMessage.author.id !== this.bot.user.id) return message.channel.send(`I didn't post that case.`);

		const messageEmbed: MessageEmbed = caseMessage.embeds[0];
		if (messageEmbed.author.name !== `${message.author.username}#${message.author.discriminator}`
			&& messageEmbed.author.name !== `${this.bot.user.username}#${this.bot.user.discriminator}`
			&& !message.member.hasPermission('MANAGE_GUILD'))
			return message.channel.send('That is not your case to edit.');

		const memberIDRegex: RegExp = /\*\*Member:\*\* .+#\d{4} \((\d+)\)/;
		const member: GuildMember = await message.guild.fetchMember(messageEmbed.description.match(memberIDRegex)[1]);
		if (!member.roles.has(message.guild.storage.getSetting('mutedrole')))
			return message.channel.send(`That member is no longer muted.`);

		const durationSet: boolean = await this.bot.mod.actions.setMuteDuration(member, message.guild, duration);
		if (!durationSet) return message.channel.send('Failed to set duration.');

		const editedCase: Message = await this.bot.mod.logger.editCase(message.guild, caseMessage, message.author, null, durationString);
		if (!editedCase) return message.channel.send('Failed to edit case.');

		return message.channel.send(`Set mute duration for ${member.user.username}#${member.user.discriminator}`);
	}
}
