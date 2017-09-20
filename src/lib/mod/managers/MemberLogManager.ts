import { GuildMember, Message, TextChannel, RichEmbed } from 'discord.js';
import { Time, ListenerUtil, RateLimiter } from 'yamdbf';
import { ModClient } from '../../ModClient';
import { Timer } from '../../timer/Timer';

const { on, registerListeners } = ListenerUtil;

/**
 * Handles logging member join/leave messages in a "#member-log" channel
 * on a server, ratelimiting as necessary to prevent spam
 *
 * TODO: Refactor this to use YAMDBF's RateLimiter stuff because it'll
 * make it all much easier and won't have to be swept on interval
 */
export class MemberLogManager
{
	private client: ModClient;
	private joinRateLimiter: RateLimiter;
	private leaveRateLimiter: RateLimiter;

	public constructor(client: ModClient)
	{
		this.client = client;
		this.joinRateLimiter = new RateLimiter('1/5m', false);
		this.leaveRateLimiter = new RateLimiter('1/5m', false);

		registerListeners(this.client, this);
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
		if (!member.guild.channels.exists('name', 'member-log')) return;

		const memberLog: TextChannel = <TextChannel> member.guild.channels.find('name', 'member-log');
		if (!memberLog.permissionsFor(this.client.user).has('SEND_MESSAGES')) return;

		// Hacky solution until I make breaking changes to RateLimiter to support
		// use-cases that don't involve messages, but at least this cleans up
		// the mess that was my original implementation of member-log ratelimiting
		const messageSpoof: any = { guild: member.guild, channel: memberLog };
		if (joined && !this.joinRateLimiter.get(messageSpoof, member.user).call()) return;
		else if (!joined && !this.leaveRateLimiter.get(messageSpoof, member.user).call()) return;

		const embed: RichEmbed = new RichEmbed()
			.setColor(joined ? 8450847 : 16039746)
			.setAuthor(`${member.user.tag} (${member.id})`, member.user.avatarURL)
			.setFooter(joined ? 'User joined' : 'User left' , '')
			.setTimestamp();

		memberLog.send({ embed });
	}
}
