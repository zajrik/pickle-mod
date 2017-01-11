import ModBot from '../ModBot';
import { GuildStorage, Message } from 'yamdbf';
import { TextChannel, Guild, Collection, User, RichEmbed, MessageEmbed } from 'discord.js';

/**
 * Contains methods and handles functionality pertaining
 * to logging moderation actions to a guild's logging channel
 */
export default class ModLogger
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
	public async findCase(guild: Guild, num: number): Promise<Message>
	{
		const messages: Collection<string, Message> = await (<TextChannel> guild.channels
			.get(this._bot.guildStorages.get(guild).getSetting('modlogs')))
			.fetchMessages({ limit: 100 });

		const foundCase: Message = messages.find((msg: Message) =>
			msg.embeds.length > 0 ? msg.embeds[0].footer.text === `Case ${num}` : false);

		return foundCase || null;
	}

	/**
	 * Edit a logged moderation case to provide or edit a reason.
	 * Only works if the editor is the original issuer
	 */
	public async editCase(guild: Guild, num: number, issuer: User, reason: string): Promise<Message>
	{
		const caseMessage: Message = await this.findCase(guild, num);
		if (!caseMessage) return null;
		let messageEmbed: MessageEmbed = caseMessage.embeds[0];
		if (messageEmbed.author.name !== `${issuer.username}#${issuer.discriminator}`
			&& messageEmbed.author.name !== `${this._bot.user.username}#${this._bot.user.discriminator}`)
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
	public async mergeSoftban(guild: Guild, first: number, second: number, issuer: User, reason: string): Promise<Message>
	{
		const banCaseMessage: Message = await this.findCase(guild, first);
		if (!banCaseMessage) return null;
		console.log(`Found case ${first}`);

		const banMessageEmbed: MessageEmbed = banCaseMessage.embeds[0];
		if (banMessageEmbed.author.name !== `${this._bot.user.username}#${this._bot.user.discriminator}`
			&& banMessageEmbed.author.name !== `${issuer.username}#${issuer.discriminator}`) return null;
		console.log(`Issuer was valid`);

		const unbanCaseMessage: Message = await this.findCase(guild, second);
		if (!unbanCaseMessage) return null;
		console.log(`Found case ${second}`);

		const embed: RichEmbed = new RichEmbed()
			.setColor(banMessageEmbed.color)
			.setAuthor(`${issuer.username}#${issuer.discriminator}`, issuer.avatarURL)
			.setDescription(banMessageEmbed.description
				.replace(/\*\*Action:\*\* .+/, `**Action:** Softban`)
				.replace(/\*\*Reason:\*\*/, `**Reason:** ${reason}`))
			.setFooter(banMessageEmbed.footer.text)
			.setTimestamp(new Date(banMessageEmbed.createdTimestamp));

		const storage: GuildStorage = this._bot.guildStorages.get(guild);
		storage.setSetting('cases', storage.getSetting('cases') - 1);
		return banCaseMessage.edit('', Object.assign({}, { embed })).then(() => unbanCaseMessage.delete());
	}
}
