import Actions from './Actions';
import Logger from './Logger';
import Events from './Events';
import Scheduler from './Scheduler';
import ModBot from '../ModBot';
import { GuildStorage, Message } from 'yamdbf';
import { GuildMember, Guild } from 'discord.js';
import { HistoryManager } from './managers/HistoryManager';
import { LockdownManager } from './managers/LockdownManager';
import { MuteManager } from './managers/MuteManager';

/**
 * Handles loading the different moderation controllers
 * and has methods for determining if moderation commands
 * are able to be run within a guild by the provided member
 */
export default class ModLoader
{
	private _bot: ModBot;
	private _events: Events;
	private _scheduler: Scheduler;

	public actions: Actions;
	public logger: Logger;
	public managers: {
		history: HistoryManager,
		lockdown: LockdownManager,
		mute: MuteManager
	};

	public constructor(bot: ModBot)
	{
		this._bot = bot;
		this.actions = new Actions(this._bot);
		this.logger = new Logger(this._bot);

		this.managers = {
			history: new HistoryManager(),
			lockdown: new LockdownManager(this._bot),
			mute: new MuteManager(this._bot)
		};

		this._events = new Events(this._bot);
		this._scheduler = new Scheduler(this._bot);
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

	/** Send an error message for why a mod command cannot be called */
	public async sendModError(message: Message): Promise<Message | Message[]>
	{
		const modRoleName: string = message.guild.storage.getSetting('modrole') ?
			`\`${message.guild.roles.get(message.guild.storage.getSetting('modrole')).name}\`` : 'configured mod';
		const errors: any = {
			NO_GUILD: 'Command cannot be called from DM.',
			NO_LOGGING: 'Server does not have a set logging channel.',
			NO_LOG_PERMS: `I don't have permission to send messages in ${
				message.guild.channels.get(message.guild.storage.getSetting('modlogs'))}`,
			NO_APPEALS: 'Server does not have a set ban appeals channel.',
			NO_SET_MOD_ROLE: 'Server does not have a set Mod role.',
			NO_MOD_ROLE: `You must have the ${modRoleName} role to use Mod commands.`
		};

		if (!message.guild) return await message.channel.send(`Error: ${errors.NO_GUILD}`);
		if (!this.hasLoggingChannel(message.guild))
			return await message.channel.send(`Error: ${errors.NO_LOGGING}`);
		if (!message.guild.channels.get(message.guild.storage.getSetting('modlogs'))
			.permissionsFor(this._bot.user).hasPermission('SEND_MESSAGES'))
			return await message.channel.send(`Error: ${errors.NO_LOG_PERMS}`);
		if (!this.hasAppealsChannel(message.guild))
			return await message.channel.send(`Error: ${errors.NO_APPEALS}`);
		if (!this.hasSetModRole(message.guild))
			return await message.channel.send(`Error: ${errors.NO_SET_MOD_ROLE}`);
		if (!this.hasModRole(message.member))
			return await message.channel.send(`Error: ${errors.NO_MOD_ROLE}`);
	}
}
