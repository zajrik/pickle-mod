import ModBot from '../ModBot';
import { GuildStorage, Message } from 'yamdbf';
import { TextChannel, Guild, Collection, User, RichEmbed, MessageEmbed, MessageCollector } from 'discord.js';

/**
 * Contains methods and handles functionality pertaining
 * to logging moderation actions to a guild's logging channel
 */
export default class Logger
{
	private _bot: ModBot;

	public constructor(bot: ModBot)
	{
		this._bot = bot;
	}

	/**
	 * Post the moderation case to the mod-logs channel
	 */
	public caseLog(user: User | string,
					guild: Guild,
					type: 'Warn' | 'Mute' | 'Kick' | 'Softban' | 'Ban' | 'Unban',
					reason: string,
					issuer: User,
					duration?: string): Promise<Message>
	{
		if (!this._bot.mod.hasLoggingChannel(guild)) return null;
		const storage: GuildStorage = this._bot.guildStorages.get(guild);
		let caseNum: number = storage.getSetting('cases') || 0;
		caseNum++;
		storage.setSetting('cases', caseNum);

		enum colors
		{
			'Unban' = 8450847,
			'Warn' = 16776960,
			'Mute' = 16763904,
			'Kick' = 16745216,
			'Softban' = 16745216,
			'Ban' = 16718080
		}

		const embed: RichEmbed = new RichEmbed()
			.setColor(colors[type])
			.setAuthor(`${issuer.username}#${issuer.discriminator}`, issuer.avatarURL)
			.setDescription(`**Member:** ${(<User> user).username}#${(<User> user).discriminator} (${(<User> user).id})\n`
				+ `**Action:** ${type}\n`
				+ `${duration ? `**Length:** ${duration}\n` : ''}`
				+ `**Reason:** ${reason}`)
			.setFooter(`Case ${caseNum}`)
			.setTimestamp();

		return (<TextChannel> guild.channels.get(storage.getSetting('modlogs'))).sendEmbed(embed);
	}

	/**
	 * Find the specified logged case message
	 */
	public async findCase(guild: Guild, loggedCase: int): Promise<Message>
	{
		const messages: Collection<string, Message> = await (<TextChannel> guild.channels
			.get(this._bot.guildStorages.get(guild).getSetting('modlogs')))
			.fetchMessages({ limit: 100 });

		const foundCase: Message = messages.find((msg: Message) =>
			msg.embeds.length > 0 ? msg.embeds[0].footer.text === `Case ${loggedCase}` : false);

		return foundCase || null;
	}

	/**
	 * Edit a logged moderation case to provide or edit a reason.
	 * Only works if the editor is the original issuer
	 */
	public async editCase(guild: Guild, loggedCase: int | Message, issuer: User, reason: string): Promise<Message>
	{
		let caseMessage: Message;
		if (typeof loggedCase !== 'number') caseMessage = <Message> loggedCase;
		else caseMessage = await this.findCase(guild, <int> loggedCase);
		if (!caseMessage) return null;

		let messageEmbed: MessageEmbed = caseMessage.embeds[0];
		if (messageEmbed.author.name !== `${issuer.username}#${issuer.discriminator}`
			&& messageEmbed.author.name !== `${this._bot.user.username}#${this._bot.user.discriminator}`
			&& !(await guild.fetchMember(issuer)).hasPermission('MANAGE_GUILD'))
			return null;

		const embed: RichEmbed = new RichEmbed()
			.setColor(messageEmbed.color)
			.setAuthor(`${issuer.username}#${issuer.discriminator}`, issuer.avatarURL)
			.setDescription(messageEmbed.description.replace(/\*\*Reason:\*\* .+/, `**Reason:** ${reason}`))
			.setFooter(messageEmbed.footer.text)
			.setTimestamp(new Date(messageEmbed.createdTimestamp));

		return caseMessage.edit('', Object.assign({}, { embed }));
	}

	/**
	 * Merge two cases (ban and unban) together with a new reason
	 */
	public async mergeSoftban(guild: Guild, ban: int | Message, unban: int | Message, issuer: User, reason: string): Promise<Message>
	{
		let banCaseMessage: Message;
		if (typeof ban !== 'number') banCaseMessage = <Message> ban;
		else banCaseMessage = await this.findCase(guild, <int> ban);
		if (!banCaseMessage) return null;

		const banMessageEmbed: MessageEmbed = banCaseMessage.embeds[0];
		if (banMessageEmbed.author.name !== `${this._bot.user.username}#${this._bot.user.discriminator}`
			&& banMessageEmbed.author.name !== `${issuer.username}#${issuer.discriminator}`) return null;

		let unbanCaseMessage: Message;
		if (typeof unban !== 'number') unbanCaseMessage = <Message> unban;
		else unbanCaseMessage = await this.findCase(guild, <int> unban);
		if (!unbanCaseMessage) return null;

		const embed: RichEmbed = new RichEmbed()
			.setColor(banMessageEmbed.color)
			.setAuthor(`${issuer.username}#${issuer.discriminator}`, issuer.avatarURL)
			.setDescription(banMessageEmbed.description
				.replace(/\*\*Action:\*\* .+/, `**Action:** Softban`)
				.replace(/\*\*Reason:\*\* .+/, `**Reason:** ${reason}`))
			.setFooter(banMessageEmbed.footer.text)
			.setTimestamp(new Date(banMessageEmbed.createdTimestamp));

		const storage: GuildStorage = this._bot.guildStorages.get(guild);
		storage.setSetting('cases', storage.getSetting('cases') - 1);
		return banCaseMessage.edit('', Object.assign({}, { embed })).then(() => unbanCaseMessage.delete());
	}

	/**
	 * Return a promise that resolves with a logged moderation
	 * case or cases (softban) for bans/unbans
	 */
	public async awaitCase(guild: Guild, user: User, type: 'Ban' | 'Unban' | 'Softban'): Promise<Message | Message[]>
	{
		return <any> new Promise((resolve: Function) =>
		{
			const logs: TextChannel = <TextChannel> guild.channels.get(this._bot.guildStorages.get(guild).getSetting('modlogs'));
			const memberIDRegex: RegExp = /\*\*Member:\*\* .+#\d{4} \((\d+)\)/;
			const actionRegex: RegExp = /\*\*Action:\*\* (Ban|Unban|Softban)/;

			const collector: MessageCollector = logs.createCollector((m: Message) => m.author.id === this._bot.user.id
				&& (m.embeds[0] && m.embeds[0].description.match(memberIDRegex)[1] === user.id), { time: 120e3 });

			let found: Message | Message[];

			switch (type)
			{
				case 'Ban':
				case 'Unban':
					collector.on('message', (message: Message) =>
					{
						if (/Ban|Unban/.test(message.embeds[0].description.match(actionRegex)[1]))
						{
							found = message;
							collector.stop('found');
						}
					});
					break;

				case 'Softban':
					let softbanResult: boolean[] = [false, false];
					found = [null, null];
					collector.on('message', (message: Message) =>
					{
						if (message.embeds[0].description.match(actionRegex)[1] === 'Ban')
						{
							found[0] = message;
							softbanResult[0] = true;
						}
						else if (message.embeds[0].description.match(actionRegex)[1] === 'Unban')
						{
							found[1] = message;
							softbanResult[1] = true;
						}
						if (softbanResult[0] && softbanResult[1]) collector.stop('found');
					});
			}

			collector.on('end', () =>
			{
				return resolve(found);
			});
		});
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
		if (start.channel.id !== start.guild.storage.getSetting('modlogs')
			|| (start.embeds[0] && !caseRegex.test(start.embeds[0].footer.text))) return false;

		const logs: TextChannel = <TextChannel> start.channel;
		const startCase: int = parseInt(start.embeds[0].footer.text.match(caseRegex)[1]);
		let currentCase: int = startCase;

		const cases: Message[] = (await logs.fetchMessages({ limit: 100, after: start.id })).array().reverse();
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

			await loggedCase.edit('', Object.assign({}, { embed }));
		}
		start.guild.storage.setSetting('cases', currentCase);

		return true;
	}
}
