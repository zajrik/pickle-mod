import Time from './Time';
import Timer from './timer/Timer';
import ModBot from './ModBot';
import { LocalStorage, GuildStorage, Message } from 'yamdbf';
import { TextChannel, GuildMember, Guild, Collection, User, RichEmbed, MessageEmbed } from 'discord.js';

/**
 * Storage entry containing all users with active mutes
 * and their Mute objects representing mutes in each guild
 */
export type ActiveMutes = { [id: string]: MuteObj[] }

/**
 * A mute entry in storage
 */
export type MuteObj = {
	raw: string;
	user: string;
	guild: string;
	duration: number;
	timestamp: number;
}

/**
 * Storage entry containing all users with active bans
 * and their ban objects representing bans in each guild
 */
export type ActiveBans = { [id: string]: BanObj[] }

/**
 * A ban entry in storage
 */
export type BanObj = {
	user: string;
	raw: string;
	guild: string;
	guildName: string;
	timestamp: number;
}

/**
 * Storage entry containing all active appeals
 */
export type ActiveAppeals = { [id: string]: string }

/**
 * Storage entry containing all guilds with active lockdowns
 * and their lockdown objects
 */
export type ActiveLockdowns = { [id: string]: LockdownObj }

/**
 * A lockdown entry in storage. Contains information necessary
 * for later removal of the channel lockdown
 */
export type LockdownObj = {
	message: string;
	channel: string;
	allow: number;
	deny: number;
	duration: number;
	timestamp: number;
}

/**
 * Provides controls allowing the bot to execute moderation commands
 * called by users of the appropriate role
 */
export default class ModActions
{
	private _bot: ModBot;
	private _mutedOverwrites: any;

	public constructor(bot: ModBot)
	{
		this._bot = bot;

		this._bot.on('guildCreate', (guild: Guild) =>
		{
			// Implement a message with the setup instructions
		});

		this._bot.on('guildBanAdd', async (guild: Guild, user: User) =>
		{
			let settings: GuildStorage = this._bot.guildStorages.get(guild);
			if (!this.hasLoggingChannel(guild)) return;
			const storage: LocalStorage = this._bot.storage;

			// Add the ban to storage for appealing
			await storage.nonConcurrentAccess('activeBans', (key: string) =>
			{
				const activeBans: ActiveBans = storage.getItem(key) || {};
				if (!activeBans[user.id]) activeBans[user.id] = [];
				activeBans[user.id].push({
					user: user.id,
					raw: `${user.username}#${user.discriminator}`,
					guild: guild.id,
					guildName: guild.name,
					timestamp: new Date().getTime()
				});
				storage.setItem(key, activeBans);
			});

			await this.caseLog(
				user,
				guild,
				'Ban',
				`Use \`${settings.getSetting('prefix')}reason ${settings.getSetting('cases') + 1} <reason text>\` to set a reason for this ban`,
				this._bot.user);
		});

		this._bot.on('guildBanRemove', async (guild: Guild, user: User) =>
		{
			let settings: GuildStorage = this._bot.guildStorages.get(guild);
			if (!this.hasLoggingChannel(guild)) return;
			const storage: LocalStorage = this._bot.storage;

			// Remove the active ban in storage for the user
			await storage.nonConcurrentAccess('activeBans', (key: string) =>
			{
				const activeBans: ActiveBans = storage.getItem(key) || {};
				const bans: BanObj[] = activeBans[user.id];
				for (let i: number = 0; i < bans.length; i++)
				{
					if (bans[i].guild === guild.id) bans.splice(i--, 1);
				}
				if (bans.length === 0) delete activeBans[user.id];
				else activeBans[user.id] = bans;
				storage.setItem(key, activeBans);
			});

			// Try to remove an active appeal for the user if there
			// was one in the guild
			await storage.nonConcurrentAccess('activeAppeals', async (key: string) =>
			{
				const activeAppeals: ActiveAppeals = storage.getItem(key) || {};
				const appealsChannel: TextChannel = <TextChannel> guild.channels
					.get(settings.getSetting('appeals'));
				try
				{
					const appeal: Message = <Message> await appealsChannel.fetchMessage(activeAppeals[user.id]);
					appeal.delete();
					delete activeAppeals[user.id];
					storage.setItem(key, activeAppeals);
				}
				catch (err)
				{
					return;
				}
			});

			await this.caseLog(
				user,
				guild,
				'Unban',
				`Use \`${settings.getSetting('prefix')}reason ${settings.getSetting('cases') + 1} <reason text>\` to set a reason for this unban`,
				this._bot.user);
		});

		// Add timer for auto-removal of expired user mutes
		this._bot.timers.add(new Timer(this._bot, 'mute', 30, async () =>
		{
			const storage: LocalStorage = this._bot.storage;
			storage.nonConcurrentAccess('activeMutes', async (key: string) =>
			{
				let activeMutes: ActiveMutes = storage.getItem(key);
				if (!activeMutes) return;
				for (let user of Object.keys(activeMutes))
				{
					if (activeMutes[user].length === 0) { delete activeMutes[user]; continue; };
					for (let i: number = 0; i < activeMutes[user].length; i++)
					{
						const mute: MuteObj = activeMutes[user][i];
						const isMuted: boolean = !!(await this._bot.guilds.get(mute.guild)
							.fetchMember(user)).roles.find('name', 'Muted');
						if (!mute.duration && isMuted) continue;
						else if (!mute.duration) mute.duration = 0;
						if (Time.difference(mute.duration, Time.now() - mute.timestamp).ms > 1) continue;
						console.log(`Removing expired mute for user '${mute.raw}'`);
						const guild: Guild = this._bot.guilds.get(mute.guild);
						const member: GuildMember = guild.members.get(mute.user);
						await member.removeRole(guild.roles.find('name', 'Muted'));
						member.sendMessage(`Your mute on ${guild.name} has been lifted. You may now send messages.`);
						activeMutes[user].splice(i--, 1);
					}
				}
				storage.setItem(key, activeMutes);
			});
		}));

		// Add timer for auto-removal of expired channel lockdowns
		this._bot.timers.add(new Timer(this._bot, 'lockdown', 30, async () =>
		{
			const storage: LocalStorage = this._bot.storage;
			storage.nonConcurrentAccess('activeLockdowns', async (key: string) =>
			{
				const activeLockdowns: ActiveLockdowns = storage.getItem(key);
				if (!activeLockdowns) return;
				for (let id of Object.keys(activeLockdowns))
				{
					const lockdown: LockdownObj = activeLockdowns[id];
					const channel: TextChannel = <TextChannel> this._bot.channels.get(lockdown.channel);
					if (Time.difference(lockdown.duration, Time.now() - lockdown.timestamp).ms > 1) continue;
					console.log(`Removing expired lockdown for channel '${channel.name}' in guild '${channel.guild.name}'`);
					const payload: any = {
						id: channel.guild.roles.find('name', '@everyone').id,
						type: 'role',
						allow: lockdown.allow,
						deny: lockdown.deny
					};
					await (<any> this._bot).rest.methods.setChannelOverwrite(channel, payload);
					delete activeLockdowns[id];
					channel.sendMessage('**The lockdown on this channel has ended.**');
				}
				storage.setItem(key, activeLockdowns);
			});
		}));
	}

	/**
	 * Increment the number of times the given user has
	 * received a given type of formal moderation action
	 */
	private _count(user: User | string,
					guild: Guild | string,
					type: 'warnings' | 'mutes' | 'kicks' | 'softbans' | 'bans'): void
	{
		const storage: GuildStorage = this._bot.guildStorages.get(<string> guild);
		let counts: any = storage.getItem(type);
		if (!counts)
		{
			counts = {};
			counts[(<User> user).id || <string> user] = 0;
		}
		counts[(<User> user).id || <string> user]++;
		storage.setItem(type, counts);
	}

	/** Check whether the channel for case logging has been set for a guild */
	public hasLoggingChannel(guild: Guild): boolean
	{
		const storage: GuildStorage = this._bot.guildStorages.get(guild);
		return Boolean(storage.settingExists('modlogs') && guild.channels.has(storage.getSetting('modlogs')));
	}

	public hasAppealsChannel(guild: Guild): boolean
	{
		const storage: GuildStorage = this._bot.guildStorages.get(guild);
		return Boolean(storage.settingExists('appeals') && guild.channels.has(storage.getSetting('appeals')));
	}

	/** Check whether a mod role has been set for a guild */
	public hasSetModRole(guild: Guild): boolean
	{
		const storage: GuildStorage = this._bot.guildStorages.get(guild);
		return Boolean(storage.settingExists('modrole') && guild.roles.has(storage.getSetting('modrole')));
	}

	/** Check whether a muted role has been set for a guild */
	public hasSetMutedRole(guild: Guild): boolean
	{
		const storage: GuildStorage = this._bot.guildStorages.get(guild);
		return Boolean(storage.settingExists('mutedrole') && guild.roles.has(storage.getSetting('mutedrole')));
	}

	/** Check whether a user has the mod role for a guild */
	public hasModRole(member: GuildMember): boolean
	{
		if (!this.hasSetModRole(member.guild)) return false;
		const storage: GuildStorage = this._bot.guildStorages.get(member.guild);
		return member.roles.has(storage.getSetting('modrole'));
	}

	/** Check whether a member is allowed to call mod commands */
	public canCallModCommand(message: Message): boolean
	{
		if (!this.hasLoggingChannel(message.guild)) return false;
		if (!this.hasAppealsChannel(message.guild)) return false;
		if (!this.hasSetModRole(message.guild)) return false;
		if (!this.hasModRole(message.member)) return false;
		return true;
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
		if (!this.hasLoggingChannel(guild)) return null;
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
		if (messageEmbed.author.name !== `${this._bot.user.username}#${this._bot.user.discriminator}`
			|| messageEmbed.author.name !== `${issuer.username}#${issuer.discriminator}`) return null;

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

	/**
	 * Check the number of past offenses a user has had
	 */
	public checkUserHistory(guild: Guild, user: User): { toString: () => string, color: number, values: number[]}
	{
		const storage: GuildStorage = this._bot.guildStorages.get(guild);
		const [warns, mutes, kicks, softbans, bans]: number[] = ['warnings', 'mutes', 'kicks', 'softbans', 'bans']
			.map((type: string) => (storage.getItem(type) || {})[user.id] || 0);
		const values: number[] = [warns, mutes, kicks, softbans, bans];
		const colors: number[] = [
			8450847,
			10870283,
			13091073,
			14917123,
			16152591,
			16667430,
			16462404
		];
		const colorIndex: number = Math.min(values
			.reduce((a: number, b: number) => a + b), colors.length - 1);

		return {
			toString: () => `This user has ${warns} warnings, ${mutes} mutes, ${kicks + softbans} kicks, and ${bans} bans.`,
			color: colors[colorIndex],
			values: values
		};
	}

	/**
	 * Give a formal warning to the provided user
	 */
	public async warn(user: User | string, guild: Guild): Promise<User | string>
	{
		this._count(user, guild, 'warnings');
		return user;
	}

	/**
	 * Mute a user in a guild
	 */
	public async mute(user: User | string, guild: Guild): Promise<GuildMember>
	{
		this._count(user, guild, 'mutes');
		const member: GuildMember = guild.members.get((<User> user).id || <string> user);
		const storage: GuildStorage = this._bot.guildStorages.get(guild);
		return await member.addRole(guild.roles.get(storage.getSetting('mutedrole')));
	}

	/**
	 * Unmute a user in a guild
	 */
	public async unmute(user: User | string, guild: Guild): Promise<GuildMember>
	{
		const member: GuildMember = guild.members.get((<User> user).id || <string> user);
		const storage: GuildStorage = this._bot.guildStorages.get(guild);
		return await member.removeRole(guild.roles.get(storage.getSetting('mutedrole')));
	}

	/**
	 * Kick a user from a guild
	 */
	public async kick(user: User | string, guild: Guild): Promise<GuildMember>
	{
		this._count(user, guild, 'kicks');
		const member: GuildMember = guild.members.get((<User> user).id || <string> user);
		return await member.kick();
	}

	/**
	 * Ban a user from a guild
	 */
	public async ban(user: User | string, guild: Guild): Promise<GuildMember>
	{
		this._count(user, guild, 'bans');
		const member: GuildMember = guild.members.get((<User> user).id || <string> user);
		return <GuildMember> await guild.ban(member, 7);
	}

	/**
	 * Unban a user from a guild. Requires knowledge of the user's ID
	 */
	public async unban(id: string, guild: Guild): Promise<User>
	{
		return await guild.unban(id);
	}

	/**
	 * Softban a user from a guild, removing the past 7 days of their messages
	 */
	public async softban(user: User | string, guild: Guild): Promise<User>
	{
		this._count(user, guild, 'softbans');
		const member: GuildMember = guild.members.get((<User> user).id || <string> user);
		await guild.ban(member, 7);
		await new Promise((r: any) => setTimeout(r, 5e3));
		return await guild.unban(member.id);
	}
}
