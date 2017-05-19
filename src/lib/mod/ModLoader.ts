import { GuildStorage, Message } from 'yamdbf';
import { GuildMember, Guild } from 'discord.js';
import { MentionSpamManager } from './managers/MentionSpamManager';
import { MemberLogManager } from './managers/MemberLogManager';
import { LockdownManager } from './managers/LockdownManager';
import { HistoryManager } from './managers/HistoryManager';
import { MuteManager } from './managers/MuteManager';
import { ModClient } from '../ModClient';
import { Scheduler } from './Scheduler';
import { Actions } from './Actions';
import { Events } from './Events';
import { Logger } from './Logger';

/**
 * Handles loading the different moderation controllers
 * and has methods for determining if moderation commands
 * are able to be run within a guild by the provided member
 */
export class ModLoader
{
	private _client: ModClient;
	private _events: Events;
	private _scheduler: Scheduler;

	public actions: Actions;
	public logger: Logger;
	public managers: {
		history: HistoryManager,
		lockdown: LockdownManager,
		mute: MuteManager,
		memberLog: MemberLogManager,
		mentionSpam: MentionSpamManager
	};

	public constructor(client: ModClient)
	{
		this._client = client;
		this.actions = new Actions(this._client);
		this.logger = new Logger(this._client);

		this.managers = {
			history: new HistoryManager(),
			lockdown: new LockdownManager(this._client),
			mute: new MuteManager(this._client),
			memberLog: new MemberLogManager(this._client),
			mentionSpam: new MentionSpamManager(this._client)
		};

		this._events = new Events(this._client);
		this._scheduler = new Scheduler(this._client);
	}

	/** Initialize storage-using classes */
	public async init(): Promise<void>
	{
		await this.managers.mute.init();
		await this.managers.history.init();
		await this.managers.lockdown.init();
	}

	/** Check whether the channel for case logging has been set for a guild */
	public async hasLoggingChannel(guild: Guild): Promise<boolean>
	{
		const storage: GuildStorage = this._client.storage.guilds.get(guild.id);
		return Boolean(await storage.settings.exists('modlogs')
			&& guild.channels.has(await storage.settings.get('modlogs')));
	}

	public async hasAppealsChannel(guild: Guild): Promise<boolean>
	{
		const storage: GuildStorage = this._client.storage.guilds.get(guild.id);
		return Boolean(await storage.settings.exists('appeals')
			&& guild.channels.has(await storage.settings.get('appeals')));
	}

	/** Check whether a mod role has been set for a guild */
	public async hasSetModRole(guild: Guild): Promise<boolean>
	{
		const storage: GuildStorage = this._client.storage.guilds.get(guild.id);
		return Boolean(await storage.settings.exists('modrole')
			&& guild.roles.has(await storage.settings.get('modrole')));
	}

	/** Check whether a muted role has been set for a guild */
	public async hasSetMutedRole(guild: Guild): Promise<boolean>
	{
		const storage: GuildStorage = this._client.storage.guilds.get(guild.id);
		return Boolean(await storage.settings.exists('mutedrole')
			&& guild.roles.has(await storage.settings.get('mutedrole')));
	}

	/** Check whether a user has the mod role for a guild */
	public async hasModRole(member: GuildMember): Promise<boolean>
	{
		if (!await this.hasSetModRole(member.guild)) return false;
		const storage: GuildStorage = this._client.storage.guilds.get(member.guild.id);
		return member.roles.has(await storage.settings.get('modrole'));
	}

	/** Check whether a member is allowed to call mod commands */
	public async canCallModCommand(message: Message): Promise<boolean>
	{
		if (!message.guild) return false;
		if (!message.member) message.member = await message.guild.fetchMember(message.author);
		if (!await this.hasLoggingChannel(message.guild)) return false;
		if (await message.guild.storage.settings.exists('modlogs') &&
			!message.guild.channels.get(await message.guild.storage.settings.get('modlogs'))
				.permissionsFor(this._client.user).has('SEND_MESSAGES')) return false;
		if (!await this.hasAppealsChannel(message.guild)) return false;
		if (!await this.hasSetModRole(message.guild)) return false;
		if (!await this.hasModRole(message.member)) return false;
		return true;
	}

	/** Send an error message for why a mod command cannot be called */
	public async sendModError(message: Message): Promise<Message | Message[]>
	{
		const modRoleName: string = await message.guild.storage.settings.exists('modrole') ?
			`\`${message.guild.roles.get(await message.guild.storage.settings.get('modrole')).name}\`` : 'configured mod';
		const errors: any = {
			NO_GUILD: 'Command cannot be called from DM.',
			NO_LOGGING: 'Server does not have a set logging channel.',
			NO_LOG_PERMS: `I don't have permission to send messages in ${
				message.guild.channels.get(await message.guild.storage.settings.get('modlogs'))}`,
			NO_APPEALS: 'Server does not have a set ban appeals channel.',
			NO_SET_MOD_ROLE: 'Server does not have a set Mod role.',
			NO_MOD_ROLE: `You must have the ${modRoleName} role to use Mod commands.`
		};

		if (!message.guild) return await message.channel.send(`Error: ${errors.NO_GUILD}`);
		if (!await this.hasLoggingChannel(message.guild))
			return await message.channel.send(`Error: ${errors.NO_LOGGING}`);
		if (await message.guild.storage.settings.exists('modlogs') &&
			!message.guild.channels.get(await message.guild.storage.settings.get('modlogs'))
				.permissionsFor(this._client.user).has('SEND_MESSAGES'))
			return await message.channel.send(`Error: ${errors.NO_LOG_PERMS}`);
		if (!await this.hasAppealsChannel(message.guild))
			return await message.channel.send(`Error: ${errors.NO_APPEALS}`);
		if (!await this.hasSetModRole(message.guild))
			return await message.channel.send(`Error: ${errors.NO_SET_MOD_ROLE}`);
		if (!await this.hasModRole(message.member))
			return await message.channel.send(`Error: ${errors.NO_MOD_ROLE}`);
	}
}
