import { Collection, GuildMember, Message, Role, User } from 'discord.js';
import { GuildStorage, Logger, logger } from 'yamdbf';
import { stringResource as res } from '../../Util';
import ModBot from '../../ModBot';

export class MentionSpamManager
{
	@logger private readonly _logger: Logger;
	private client: ModBot;
	private guilds: Collection<string, Collection<string, TrackedMention[]>>;
	private baseThreshold: int = 6;
	public constructor(client: ModBot)
	{
		this.client = client;
		this.guilds = new Collection<string, Collection<string, TrackedMention[]>>();

		for (const guild of this.client.guilds.values())
			this.guilds.set(guild.id, new Collection<string, TrackedMention[]>());

		this.client.on('message', message => this.onMessage(message));
	}

	/**
	 * Handle mentions within each message
	 */
	private async onMessage(message: Message): Promise<void>
	{
		if (!message.guild) return;
		const storage: GuildStorage = this.client.storage.guilds.get(message.guild.id);
		if (message.system
			|| message.webhookID
			|| message.author.bot
			|| message.guild.ownerID === message.author.id) return;

		const member: GuildMember = (message.member || await message.guild.fetchMember(message.author.id));
		if (!member) return;
		if (member.permissions.has('ADMINISTRATOR')
			|| member.roles.has(await storage.settings.get('modrole'))
			|| !await storage.settings.get('mentionSpam')) return;

		const mentions: Collection<string, any> =
			(<Collection<string, Role | GuildMember | User>> message.mentions.members)
				.concat(message.mentions.roles, message.mentions.users)
				.filter(a => (<GuildMember> a).user ? !(<GuildMember> a).user.bot : !(<User> a).bot);

		if (mentions.has(message.author.id)) mentions.delete(message.author.id);

		let points: int = mentions.size;
		if (message.mentions.everyone) points += 2;

		const threshold: int = Math.floor(Math.pow(
			(Date.now() - message.member.joinedTimestamp) / 1000 / 60 / 60 / 24, 1 / 3)) + this.baseThreshold;

		if (this.call(message.member, points, threshold))
		{
			if (this.getPoints(message.member) >= Math.round(threshold * .7))
				message.channel.send(
					`${message.author} Be careful. You're approaching the auto-ban threshold for mention spam.`);
			return;
		}

		try
		{
			await message.author.send(res('MSG_DM_AUTO_BAN', { guildName: message.guild.name }), { split: true });
		}
		catch (err) { this._logger.log('MentionSpamManager', `Failed to send ban DM to ${message.author.tag}`); }

		this.client.mod.actions.ban(message.author, message.guild);
		let banCase: Message = <Message> await this.client.mod.logger.awaitBanCase(message.guild, message.author, 'Ban');
		this.client.mod.logger.editCase(
			message.guild, banCase, this.client.user, 'Automatic ban: Exceeded mention threshold');
	}

	/**
	 * Add the given points to the member's total, returning whether or
	 * not they are still safe from banning
	 */
	public call(member: GuildMember, points: int, threshold: int): boolean
	{
		this.sweepExpired(member);

		const pointsArray: TrackedMention[] = this.get(member);
		pointsArray.push({ value: points, expires: Date.now() + 10e3 });

		const mappedPoints: int[] = pointsArray.map(a => a.value);
		if (mappedPoints.length === 0) return true;
		return mappedPoints.reduce((a, b) => a + b) < threshold;
	}

	/**
	 * Return the number of points a member currently has
	 */
	private getPoints(member: GuildMember): int
	{
		const pointsArray: int[] = this.get(member).map(a => a.value);
		if (pointsArray.length === 0) return 0;
		return pointsArray.reduce((a, b) => a + b);
	}

	/**
	 * Get the points array for the given guild member
	 */
	private get(member: GuildMember): TrackedMention[]
	{
		if (!this.guilds.has(member.guild.id))
			this.guilds.set(member.guild.id, new Collection<string, TrackedMention[]>());

		if (!this.guilds.get(member.guild.id).has(member.user.id))
			this.guilds.get(member.guild.id).set(member.user.id, []);

		return this.guilds.get(member.guild.id).get(member.user.id);
	}

	/**
	 * Remove expired tracked mentions for the given member
	 */
	private sweepExpired(member: GuildMember): void
	{
		const guild: Collection<string, TrackedMention[]> = this.guilds.get(member.guild.id);
		guild.set(member.user.id, this.get(member).filter(a => a.expires > Date.now()));
	}
}
