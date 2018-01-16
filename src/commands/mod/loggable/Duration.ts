import { Command, Message, Middleware, CommandDecorators, Time } from 'yamdbf';
import { GuildMember, MessageEmbed, Guild } from 'discord.js';
import { ModClient } from '../../../client/ModClient';
import { MuteManager } from '../../../client/managers/MuteManager';
import { modOnly } from '../../../util/Util';

const { resolve, expect } = Middleware;
const { using } = CommandDecorators;

export default class extends Command<ModClient>
{
	public constructor()
	{
		super({
			name: 'duration',
			aliases: ['dur'],
			desc: 'Set a duration for an active mute',
			usage: '<prefix>duration <caseNum> <duration>',
			info: 'This will restart a mute with an already set duration, applying the new duration.',
			group: 'mod',
			guildOnly: true
		});
	}

	@modOnly
	@using(resolve('caseNum: String, duration: Duration'))
	@using(expect('caseNum: String, duration: Number'))
	public async action(message: Message, [toSelect, duration]: [string | int, int]): Promise<any>
	{
		if (!isNaN(parseInt(<string> toSelect))) toSelect = parseInt(<string> toSelect);
		if (typeof toSelect === 'string' && toSelect !== 'latest')
			return message.channel.send(`You must provide a case number or 'latest'`);

		const caseNum: int = typeof toSelect === 'string' ?
			await message.guild.storage.settings.get('cases') : toSelect;
		const caseMessage: Message = await this.client.mod.logs.findCase(message.guild, caseNum);
		if (!caseMessage) return message.channel.send('Failed to fetch case.');
		if (caseMessage.author.id !== this.client.user.id) return message.channel.send(`I didn't post that case.`);

		const messageEmbed: MessageEmbed = caseMessage.embeds[0];
		if (messageEmbed.author.name !== message.author.tag
			&& messageEmbed.author.name !== this.client.user.tag
			&& !message.member.permissions.has('MANAGE_GUILD'))
			return message.channel.send('That is not your case to edit.');

		const caseTypeRegex: RegExp = /\*\*Action:\*\* (.+)/;
		if (caseTypeRegex.test(messageEmbed.description)
			&& messageEmbed.description.match(caseTypeRegex)[1] !== 'Mute')
			return message.channel.send('That is not a Mute case.');

		let member: GuildMember;
		const memberIDRegex: RegExp = /\*\*Member:\*\* .+#\d{4} \((\d+)\)/;
		try { member = await message.guild.fetchMember(messageEmbed.description.match(memberIDRegex)[1]); }
		catch { return message.channel.send(`Failed to fetch the muted member.`); }

		const guild: Guild = member.guild;
		const muteManager: MuteManager = this.client.mod.managers.mute;
		if (!await muteManager.hasMuteRole(guild, member.id))
			return message.channel.send(`That member is no longer muted.`);

		if (await muteManager.isExpired(guild, member.id))
			return message.channel.sendMessage('That mute has expired.');

		if (!await muteManager.isMuted(guild, member.id))
			return message.channel.send(
				'That member does not have stored mute data. If they are still muted\n'
				+ 'then this is in error and they will need to have their mute re-applied.');

		const started: Message = <Message> await message.channel.send('Setting mute duration...');
		await this.client.mod.actions.setMuteDuration(member, message.guild, duration);
		const editedCase: Message = await this.client.mod.logs.editCase(
			message.guild, caseMessage, message.author, null, Time.duration(duration).toSimplifiedString());
		if (!editedCase) return started.edit('Failed to edit case.');

		return started.edit(`Set mute duration for ${member.user.tag}`);
	}
}
