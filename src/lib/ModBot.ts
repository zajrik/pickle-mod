'use strict';
import { Bot, BotOptions } from 'yamdbf';
import { GuildMember, TextChannel, RichEmbed, Message } from 'discord.js';
import ModActions from './ModActions';
import TimerCollection from './timer/TimerCollection';
import Timer from './timer/Timer';

export default class ModBot extends Bot
{
	public timers: TimerCollection<string, Timer>;
	public mod: ModActions;

	public constructor(botOptions: BotOptions)
	{
		super(botOptions);
		this.timers = new TimerCollection<string, Timer>();
		this.mod = new ModActions(this);

		this.on('guildMemberAdd', (member: GuildMember) => this.memberLog(member, true, 8450847));
		this.on('guildMemberRemove', (member: GuildMember) => this.memberLog(member, false, 13091073));
		this.on('command', (name: string, args: any, original: string, execTime: number, message: Message) =>
			this.logCommand(name, args, original, execTime, message));
	}

	/**
	 * Handle creation and sending of an embed for logging guild member joins/leaves.
	 * Requires a text channel called `member-log` to be created that the bot is allowed
	 * to post to. Won't do anything if the channel does not exist
	 */
	private memberLog(member: GuildMember, joined: boolean, color: number): Promise<Message>
	{
		if (!member.guild.channels.exists('name', 'member-log')) return;
		const memberLog: TextChannel = <TextChannel> member.guild.channels.find('name', 'member-log');
		const embed: RichEmbed = new RichEmbed()
			.setColor(color)
			.setAuthor(`${member.user.username}#${member.user.discriminator} (${member.id})`, member.user.avatarURL)
			.setFooter(joined ? 'User joined' : 'User left' , '')
			.setTimestamp();
		return memberLog.sendEmbed(embed);
	}

	/**
	 * Log command usage to the logging channel in config
	 */
	private logCommand(name: string, args: any, original: string, execTime: number, message: Message): void
	{
		const logChannel: TextChannel = <TextChannel> this.channels.get(this.config.logs);
		const embed: RichEmbed = new RichEmbed()
			.setColor(11854048)
			.setAuthor(`${message.author.username}#${message.author.discriminator} (${message.author.id})`,
				message.author.avatarURL)
			.addField('Guild', message.guild.name, true)
			.addField('Exec time', `${execTime.toFixed(2)}ms`, true)
			.addField('Command content', original)
			.setFooter(message.channel.type.toUpperCase(), this.user.avatarURL)
			.setTimestamp();

		logChannel.sendEmbed(embed);
	}
}
