import { modCommand } from '../../../lib/Util';
import { Command, Message } from 'yamdbf';
import { GuildMember, MessageEmbed } from 'discord.js';
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
			extraHelp: 'This will restart a mute with an already set duration, applying the new duration.',
			group: 'mod',
			guildOnly: true
		});

		this.use(modCommand);
	}

	public async action(message: Message, args: string[]): Promise<any>
	{
		let toSelect: string | int = args.shift();
		if (!isNaN(parseInt(toSelect))) toSelect = parseInt(toSelect);
		if (typeof toSelect === 'string' && toSelect !== 'latest')
			return message.channel.send(`You must provide a case number or 'latest'`);

		const caseNum: int = typeof toSelect === 'string' ?
			message.guild.storage.getSetting('cases') : toSelect;
		const caseMessage: Message = await this.bot.mod.logger.findCase(message.guild, caseNum);
		if (!caseMessage) return message.channel.send('Failed to fetch case.');
		if (caseMessage.author.id !== this.bot.user.id) return message.channel.send(`I didn't post that case.`);

		const messageEmbed: MessageEmbed = caseMessage.embeds[0];
		if (messageEmbed.author.name !== `${message.author.username}#${message.author.discriminator}`
			&& messageEmbed.author.name !== `${this.bot.user.username}#${this.bot.user.discriminator}`
			&& !message.member.hasPermission('MANAGE_GUILD'))
			return message.channel.send('That is not your case to edit.');

		const caseTypeRegex: RegExp = /\*\*Action:\*\* (.+)/;
		if (caseTypeRegex.test(messageEmbed.description)
			&& messageEmbed.description.match(caseTypeRegex)[1] !== 'Mute')
			return message.channel.send('That is not a Mute case.');

		const durationRegex: RegExp = /\*\*Length:\*\* (.+)/;
		if (durationRegex.test(messageEmbed.description))
		{
			const timestamp: int = Time.parse(<any> messageEmbed.createdTimestamp);
			const currentDur: int = Time.parseShorthand(messageEmbed.description.match(durationRegex)[1]);
			if ((currentDur - (Time.now() - timestamp)) < 1)
				return message.channel.sendMessage('That mute has expired.');
		}

		const durationString: string = args.shift();
		const duration: int = Time.parseShorthand(durationString);
		if (!duration) return message.channel.send('You must provide a valid duration.');

		const memberIDRegex: RegExp = /\*\*Member:\*\* .+#\d{4} \((\d+)\)/;
		let member: GuildMember;
		try
		{
			member = await message.guild.fetchMember(messageEmbed.description.match(memberIDRegex)[1]);
		}
		catch (err)
		{
			return message.channel.send(`Failed to fetch the muted member.`);
		}

		const started: Message = <Message> await message.channel.send('Setting mute duration...');
		if (!member.roles.has(message.guild.storage.getSetting('mutedrole')))
			return started.edit(`That member is no longer muted.`);

		await this.bot.mod.actions.setMuteDuration(member, message.guild, duration);
		const editedCase: Message = await this.bot.mod.logger.editCase(message.guild, caseMessage, message.author, null, durationString);
		if (!editedCase) return started.edit('Failed to edit case.');

		return started.edit(`Set mute duration for ${member.user.username}#${member.user.discriminator}`);
	}
}
