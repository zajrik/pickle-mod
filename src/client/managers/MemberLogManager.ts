import { GuildMember, Message, TextChannel, MessageEmbed } from 'discord.js';
import { Time, ListenerUtil, RateLimitManager } from '@yamdbf/core';
import { ModClient } from '../../client/ModClient';
import { Timer } from '../../timer/Timer';

const { on, registerListeners } = ListenerUtil;

/**
 * Handles logging member join/leave messages in a "#member-log" channel
 * on a server, ratelimiting as necessary to prevent spam
 */
export class MemberLogManager
{
	private readonly _client: ModClient;

	public constructor(client: ModClient)
	{
		this._client = client;

		registerListeners(this._client, this);
	}

	/**
	 * Handle creation and sending of an embed for logging guild member joins/leaves.
	 * Requires a text channel called `member-log` to be created that the bot is allowed
	 * to post to. Won't do anything if the channel does not exist
	 */
	@on('guildMemberAdd')
	@on('guildMemberRemove', false)
	private logMember(member: GuildMember, joined: boolean = true): void
	{
		if (!member.guild.channels.some(c => c.name === 'member-log')) return;

		const memberLog: TextChannel = <TextChannel> member.guild.channels.find(c => c.name === 'member-log');
		if (!memberLog.permissionsFor(this._client.user).has('SEND_MESSAGES')) return;

		const rateLimiter: RateLimitManager = this._client.rateLimitManager;
		const descriptors: string[] = [member.guild.id, member.id, joined.toString()];
		if (!rateLimiter.call('1/5m', 'memberlog', ...descriptors)) return;

		const embed: MessageEmbed = new MessageEmbed()
			.setColor(joined ? 8450847 : 16039746)
			.setAuthor(`${member.user.tag} (${member.id})`, member.user.avatarURL())
			.setFooter(joined ? 'User joined' : 'User left' , '')
			.setTimestamp();

		memberLog.send({ embed });
	}
}
