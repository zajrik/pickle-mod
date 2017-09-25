import { Collection, GuildMember, Message, Role, User, Guild } from 'discord.js';
import { GuildStorage, Logger, logger, ListenerUtil } from 'yamdbf';
import { stringResource as res } from '../../Util';
import { ModClient } from '../../ModClient';
const { on, registerListeners } = ListenerUtil;

export class MentionSpamManager
{
	@logger private readonly _logger: Logger;
	private client: ModClient;
	private guilds: Collection<string, Collection<string, TrackedMention[]>>;

	public constructor(client: ModClient)
	{
		this.client = client;
		this.guilds = new Collection<string, Collection<string, TrackedMention[]>>();

		for (const guild of this.client.guilds.values())
			this.guilds.set(guild.id, new Collection<string, TrackedMention[]>());

		registerListeners(this.client, this);
	}

	/**
	 * Create a new TrackedMention[] Collection for new guilds
	 */
	@on('guildCreate')
	private async onGuildCreate(guild: Guild): Promise<void>
	{
		this.guilds.set(guild.id, new Collection<string, TrackedMention[]>());
	}

	/**
	 * Handle mentions within each message
	 */
	@on('message')
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
		if (points === 0) return;

		const baseThreshold = await storage.settings.get('mentionSpam:threshold');
		const threshold: int = Math.floor(Math.floor(Math.pow(
			(Date.now() - member.joinedTimestamp) / 1000 / 60 / 60 / 24, 1 / 3)) + baseThreshold);

		const type: string = await storage.settings.get('mentionSpam:type');
		if (this.call(member, points, threshold))
		{
			if (this.getPoints(member) >= Math.round(threshold * .7))
				message.channel.send(
					`${message.author} Be careful. You're approaching the auto-${type} threshold for mention spam.`);
			return;
		}

		const reason: string = `Automatic ${type}: Exceeded mention threshold`;

		async function kick(): Promise<void>
		{
			try
			{
				await message.author.send(
					`**You have been kicked from ${message.guild.name}**\n\n**Reason:** ${reason}`);
			}
			catch (err)
			{
				this._logger.error('MentionSpamManager', `Failed to send kick DM to ${message.author.tag}`);
			}

			await this.client.mod.actions.kick(member, message.guild, reason);
			this.client.mod.logs.logCase(message.author, message.guild, 'Kick', reason, this.client.user);
		}

		if (type === 'kick') await kick();
		else if (type === 'mute')
		{
			let muteCase: Message;
			try { muteCase = <Message> await this.client.mod.logs.awaitMuteCase(message.guild, member); }
			// Fall back to kick if muting fails
			catch { return kick(); }

			this.client.mod.logs.editCase(message.guild, muteCase, this.client.user, reason);
		}
		else if (type === 'ban')
		{
			try
			{
				await message.author.send(res('MSG_DM_AUTO_BAN', { guildName: message.guild.name }), { split: true });
			}
			catch { this._logger.log('MentionSpamManager', `Failed to send ban DM to ${message.author.tag}`); }

			let banCase: Message = <Message> await this.client.mod.logs.awaitCase(message.guild, message.author, 'Ban', reason);
			this.client.mod.logs.editCase(message.guild, banCase, this.client.user, reason);
		}
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
		if (!guild) return;

		guild.set(member.user.id, this.get(member).filter(a => a.expires > Date.now()));
	}
}
