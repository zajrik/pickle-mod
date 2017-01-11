import ModActions from './Actions';
import ModLogger from './Logger';
import ModEvents from './Events';
import ModScheduler from './Scheduler';
import ModBot from '../ModBot';
import { GuildStorage, Message } from 'yamdbf';
import { GuildMember, Guild } from 'discord.js';

/**
 * Handles loading the different moderation controllers
 * and has methods for determining if moderation commands
 * are able to be run within a guild by the provided member
 */
export default class ModLoader
{
	private _bot: ModBot;

	public actions: ModActions;
	public logger: ModLogger;
	private _events: ModEvents;
	private _scheduler: ModScheduler;

	public constructor(bot: ModBot)
	{
		this._bot = bot;
		this.actions = new ModActions(this._bot);
		this.logger = new ModLogger(this._bot);

		this._events = new ModEvents(this._bot);
		this._scheduler = new ModScheduler(this._bot);
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
		if (!message.guild) return false;
		if (!this.hasLoggingChannel(message.guild)) return false;
		if (!message.guild.channels.get(message.guild.storage.getSetting('modlogs'))
			.permissionsFor(this._bot.user).hasPermission('SEND_MESSAGES')) return false;
		if (!this.hasAppealsChannel(message.guild)) return false;
		if (!this.hasSetModRole(message.guild)) return false;
		if (!this.hasModRole(message.member)) return false;
		return true;
	}
}
