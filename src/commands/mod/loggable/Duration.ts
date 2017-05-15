import { MuteManager } from '../../../lib/mod/managers/MuteManager';
import { modOnly } from '../../../lib/Util';
import { Command, Message, Middleware, CommandDecorators } from 'yamdbf';
import { GuildMember, MessageEmbed } from 'discord.js';
import ModBot from '../../../lib/ModBot';
import Time from '../../../lib/Time';

const { resolveArgs, expect } = Middleware;
const { using } = CommandDecorators;

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
	}

	@modOnly
	@using(resolveArgs({ '<case#>': 'String', '<duration>': 'Duration' }))
	@using(expect({ '<case#>': 'String', '<duration>': 'Number' }))
	public async action(message: Message, [toSelect, duration]: [string | int, int]): Promise<any>
	{
		if (!isNaN(parseInt(<string> toSelect))) toSelect = parseInt(<string> toSelect);
		if (typeof toSelect === 'string' && toSelect !== 'latest')
			return message.channel.send(`You must provide a case number or 'latest'`);

		const caseNum: int = typeof toSelect === 'string' ?
			await message.guild.storage.settings.get('cases') : toSelect;
		const caseMessage: Message = await this.client.mod.logger.findCase(message.guild, caseNum);
		if (!caseMessage) return message.channel.send('Failed to fetch case.');
		if (caseMessage.author.id !== this.client.user.id) return message.channel.send(`I didn't post that case.`);

		const messageEmbed: MessageEmbed = caseMessage.embeds[0];
		if (messageEmbed.author.name !== `${message.author.username}#${message.author.discriminator}`
			&& messageEmbed.author.name !== `${this.client.user.username}#${this.client.user.discriminator}`
			&& !message.member.hasPermission('MANAGE_GUILD'))
			return message.channel.send('That is not your case to edit.');

		const caseTypeRegex: RegExp = /\*\*Action:\*\* (.+)/;
		if (caseTypeRegex.test(messageEmbed.description)
			&& messageEmbed.description.match(caseTypeRegex)[1] !== 'Mute')
			return message.channel.send('That is not a Mute case.');

		let member: GuildMember;
		const memberIDRegex: RegExp = /\*\*Member:\*\* .+#\d{4} \((\d+)\)/;
		try { member = await message.guild.fetchMember(messageEmbed.description.match(memberIDRegex)[1]); }
		catch (err) { return message.channel.send(`Failed to fetch the muted member.`); }

		const muteManager: MuteManager = this.client.mod.managers.mute;
		if (!muteManager.hasMuteRole(member))
			return message.channel.send(`That member is no longer muted.`);

		if (muteManager.isExpired(member))
			return message.channel.sendMessage('That mute has expired.');

		if (!muteManager.isMuted(member))
			return message.channel.send(
				'That member does not have stored mute data. If they are still muted\n'
				+ 'then this is in error and they will need to have their mute re-applied.');

		const started: Message = <Message> await message.channel.send('Setting mute duration...');
		await this.client.mod.actions.setMuteDuration(member, message.guild, duration);
		const editedCase: Message = await this.client.mod.logger.editCase(
			message.guild, caseMessage, message.author, null, Time.duration(duration).toSimplifiedString());
		if (!editedCase) return started.edit('Failed to edit case.');

		return started.edit(`Set mute duration for ${member.user.username}#${member.user.discriminator}`);
	}
}
