import ModBot from '../ModBot';
import { LocalStorage, GuildStorage, Message } from 'yamdbf';
import { TextChannel, Guild, User, } from 'discord.js';

/**
 * Handles received moderation related client events
 */
export default class ModEvents
{
	private _bot: ModBot;

	public constructor(bot: ModBot)
	{
		this._bot = bot;

		this._bot.on('guildBanAdd', (guild: Guild, user: User) => this._onGuildBanAdd(guild, user));
		this._bot.on('guildBanRemove', async (guild: Guild, user: User) => this._onGuildBanRemove(guild, user));
	}

	/**
	 * Handle guild member ban event
	 */
	private async _onGuildBanAdd(guild: Guild, user: User): Promise<void>
	{
		let settings: GuildStorage = this._bot.guildStorages.get(guild);
		if (!this._bot.mod.hasLoggingChannel(guild)) return;
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

		await this._bot.mod.logger.caseLog(
			user,
			guild,
			'Ban',
			`Use \`${settings.getSetting('prefix')}reason ${settings.getSetting('cases') + 1} <reason text>\` to set a reason for this ban`,
			this._bot.user);
	}

	/**
	 * Handle guild member unban event
	 */
	private async _onGuildBanRemove(guild: Guild, user: User): Promise<void>
	{
		let settings: GuildStorage = this._bot.guildStorages.get(guild);
		if (!this._bot.mod.hasLoggingChannel(guild)) return;
		const storage: LocalStorage = this._bot.storage;

		// Remove the active ban in storage for the user
		await storage.nonConcurrentAccess('activeBans', (key: string) =>
		{
			const activeBans: ActiveBans = storage.getItem(key) || {};
			const bans: BanObject[] = activeBans[user.id];
			if (!bans) return;
			for (let i: number = 0; i < bans.length; i++)
			{
				if (bans[i].guild === guild.id) bans.splice(i--, 1);
			}
			if (bans.length === 0) delete activeBans[user.id];
			else activeBans[user.id] = bans;
			storage.setItem(key, activeBans);
		});

		await this._bot.mod.logger.caseLog(
			user,
			guild,
			'Unban',
			`Use \`${settings.getSetting('prefix')}reason ${settings.getSetting('cases') + 1} <reason text>\` to set a reason for this unban`,
			this._bot.user);

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
	}
}
