import { TextChannel, Guild, Collection, User, RichEmbed, MessageEmbed, MessageCollector, GuildMember } from 'discord.js';
import { GuildStorage, Message, Util } from 'yamdbf';
import { CaseTypeColors } from '../Util';
import { ModClient } from '../ModClient';

/**
 * Contains methods for creating, managing, and fetching moderation logs
 */
export class ModLogs
{
	private readonly _client: ModClient;
	private _cachedCases: { [guild: string]: { [user: string]: { [type: string]: boolean } } };

	public constructor(client: ModClient)
	{
		this._client = client;
		this._cachedCases = {};
	}

	/**
	 * Cache a case type for a user in a guild as having
	 * already been logged
	 */
	public setCachedCase(guild: Guild, user: User, type: 'Ban' | 'Unban' | 'Mute'): void
	{
		Util.assignNestedValue(this._cachedCases, [guild.id, user.id, type], true);
	}

	/**
	 * Remove a cached case type for a user in a guild
	 */
	public removeCachedCase(guild: Guild, user: User, type: 'Ban' | 'Unban' | 'Mute'): void
	{
		Util.removeNestedValue(this._cachedCases, [guild.id, user.id, type]);
	}

	/**
	 * Return whether or not a user in a guild has a cached
	 * logged case type
	 */
	public isCaseCached(guild: Guild, user: User, type: 'Ban' | 'Unban' | 'Mute'): boolean
	{
		return Util.getNestedValue(this._cachedCases, [guild.id, user.id, type]);
	}

	/**
	 * Post the moderation case to the mod-logs channel
	 */
	public async logCase(user: User, guild: Guild, type: CaseType, reason: string, issuer: User, duration?: string): Promise<Message>
	{
		if (!await this._client.mod.hasLoggingChannel(guild)) return null;
		const storage: GuildStorage = this._client.storage.guilds.get(guild.id);
		let caseNum: number = await storage.settings.get('cases') || 0;
		await storage.settings.set('cases', ++caseNum);

		const embed: RichEmbed = new RichEmbed()
			.setColor(CaseTypeColors[type])
			.setAuthor(issuer.tag, issuer.avatarURL)
			.setDescription(`**Member:** ${user.tag} (${user.id})\n`
				+ `**Action:** ${type}\n`
				+ `${duration ? `**Length:** ${duration}\n` : ''}`
				+ `**Reason:** ${reason}`)
			.setFooter(`Case ${caseNum}`)
			.setTimestamp();

		return <Promise<Message>> (<TextChannel> guild.channels
			.get(await storage.settings.get('modlogs'))).send({ embed });
	}

	/**
	 * Find the specified logged case message
	 */
	public async findCase(guild: Guild, loggedCase: int): Promise<Message>
	{
		const messages: Collection<string, Message> = await (<TextChannel> guild.channels
			.get(await this._client.storage.guilds.get(guild.id).settings.get('modlogs')))
			.fetchMessages({ limit: 100 });

		const foundCase: Message = messages.find((msg: Message) =>
			msg.embeds.length > 0 ? msg.embeds[0].footer.text === `Case ${loggedCase}` : false);

		return foundCase || null;
	}

	/**
	 * Edit a logged moderation case to provide or edit a reason.
	 * Only works if the editor is the original issuer
	 */
	public async editCase(guild: Guild, loggedCase: int | Message, issuer: User, reason?: string, duration?: string): Promise<Message>
	{
		let caseMessage: Message;
		if (typeof loggedCase !== 'number') caseMessage = <Message> loggedCase;
		else caseMessage = await this.findCase(guild, <int> loggedCase);
		if (!caseMessage) return null;

		let messageEmbed: MessageEmbed = caseMessage.embeds[0];
		if (messageEmbed.author.name !== issuer.tag
			&& messageEmbed.author.name !== this._client.user.tag
			&& !(await guild.fetchMember(issuer)).permissions.has('MANAGE_GUILD'))
			return null;

		const durationRegex: RegExp = /\*\*Length:\*\* (.+)*/;
		if (!durationRegex.test(messageEmbed.description) && duration)
			messageEmbed.description = messageEmbed.description
				.replace(/(\*\*Action:\*\* Mute)/, `$1\n${`**Length:** ${duration}`}`);

		const embed: RichEmbed = new RichEmbed()
			.setColor(messageEmbed.color)
			.setAuthor(issuer.tag, issuer.avatarURL);

		if (reason) messageEmbed.description = messageEmbed.description
			.replace(/\*\*Reason:\*\* [\s\S]+/, `**Reason:** ${reason}`);

		if (duration) messageEmbed.description = messageEmbed.description
			.replace(/\*\*Length:\*\* (.+)*/, `**Length:** ${duration}`);

		embed.setDescription(messageEmbed.description)
			.setFooter(messageEmbed.footer.text);

		if (duration) embed.setTimestamp(new Date());
		else embed.setTimestamp(new Date(messageEmbed.createdTimestamp));

		return caseMessage.edit('', { embed });
	}

	/**
	 * Given a case message with a correct case number,
	 * find the cases after it and set their case numbers
	 * in order, setting guild cases to the final number
	 * when finished
	 */
	public async fixCases(start: Message): Promise<boolean>
	{
		const caseRegex: RegExp = /Case (\d+)/;
		if (start.channel.id !== await start.guild.storage.settings.get('modlogs')
			|| (start.embeds[0] && !caseRegex.test(start.embeds[0].footer.text))) return false;

		const logs: TextChannel = <TextChannel> start.channel;
		let currentCase: int = parseInt(start.embeds[0].footer.text.match(caseRegex)[1]);

		let cases: Message[] = [];
		while (true)
		{
			let fetched: Message[] = (await logs.fetchMessages({
				limit: 100,
				after: cases.length > 0 ? cases[cases.length - 1].id : start.id
			})).array().reverse();
			cases.push(...fetched);
			if (fetched.length < 100) break;
		}

		if (cases.find(c => c.author.id !== this._client.user.id))
			throw `Operation failed: Found at least one case that cannot be edited.`;

		for (const loggedCase of cases)
		{
			if (loggedCase.embeds.length === 0
				|| (loggedCase.embeds[0] && !caseRegex.test(loggedCase.embeds[0].footer.text))) continue;

			let messageEmbed: MessageEmbed = loggedCase.embeds[0];
			const embed: RichEmbed = new RichEmbed()
				.setColor(messageEmbed.color)
				.setAuthor(messageEmbed.author.name, messageEmbed.author.iconURL)
				.setDescription(messageEmbed.description)
				.setFooter(`Case ${++currentCase}`)
				.setTimestamp(new Date(messageEmbed.createdTimestamp));

			await loggedCase.edit('', { embed });
		}
		await start.guild.storage.settings.set('cases', currentCase);

		return true;
	}
}
