import { ClientStorage, GuildStorage, Message } from 'yamdbf';
import { TextChannel, Guild, GuildMember, User, Invite } from 'discord.js';
import { MuteManager } from './managers/MuteManager';
import { ModClient } from '../ModClient';

/**
 * Handles received moderation related client events
 */
export class Events
{
	private _client: ModClient;
	public constructor(client: ModClient)
	{
		this._client = client;

		this._client.on('guildBanAdd', (guild: Guild, user: User) => this._onGuildBanAdd(guild, user));
		this._client.on('guildBanRemove', async (guild: Guild, user: User) => this._onGuildBanRemove(guild, user));
		this._client.on('guildMemberUpdate', async (oldMember: GuildMember, newMember: GuildMember) =>
		{
			const storage: GuildStorage = this._client.storage.guilds.get(oldMember.guild.id);
			if (!await storage.settings.exists('mutedrole')) return;
			const mutedRole: string = await storage.settings.get('mutedrole');
			if (!oldMember.roles.has(mutedRole) && newMember.roles.has(mutedRole))
				this._onGuildMuteAdd(newMember.guild, newMember);
		});
		this._client.on('guildMemberRemove', (member: GuildMember) => this._onGuildMemberRemove(member));
		this._client.on('guildMemberAdd', (member: GuildMember) => this._onGuildMemberAdd(member));
	}

	/**
	 * Handle guildmember being muted
	 */
	private async _onGuildMuteAdd(guild: Guild, member: GuildMember): Promise<void>
	{
		const storage: GuildStorage = this._client.storage.guilds.get(guild.id);
		if (!await this._client.mod.hasLoggingChannel(guild)) return;
		if (member.roles.has(await storage.settings.get('modrole'))) return;
		const user: User = member.user;

		this._client.mod.managers.mute.set(member);
		user.send(`You've been muted in ${guild.name}`);
		console.log(`Muted user: '${user.username}#${user.discriminator}' in '${guild.name}'`);

		await this._client.mod.logs.logCase(
			user,
			guild,
			'Mute',
			`Use \`${await storage.settings.get('prefix')}reason ${
				await storage.settings.get('cases') + 1} <...reason>\` to set a reason for this mute`,
			this._client.user);
	}

	/**
	 * Handle potential mute evasion
	 */
	private async _onGuildMemberRemove(member: GuildMember): Promise<void>
	{
		const storage: GuildStorage = this._client.storage.guilds.get(member.guild.id);
		if (!member.roles.has(await storage.settings.get('mutedrole'))) return;

		const user: User = member.user;
		this._client.mod.managers.mute.setEvasionFlag(member);
		console.log(`Potential mute evasion: '${user.username}#${user.discriminator}' in '${member.guild.name}'`);
	}

	/**
	 * Handle member joining, check if they were flagged for
	 * mute evasion and reassign the muted role if so
	 */
	private async _onGuildMemberAdd(member: GuildMember): Promise<void>
	{
		const storage: GuildStorage = this._client.storage.guilds.get(member.guild.id);
		let muteManager: MuteManager = this._client.mod.managers.mute;
		if (!await muteManager.isMuted(member)) return;
		if (!await muteManager.isEvasionFlagged(member)) return;

		const mutedRole: string = await storage.settings.get('mutedrole');
		(<any> member)._roles.push(mutedRole);
		member.addRole(mutedRole);
		muteManager.clearEvasionFlag(member);
	}

	/**
	 * Handle guild member ban event
	 */
	private async _onGuildBanAdd(guild: Guild, user: User): Promise<void>
	{
		let guildStorage: GuildStorage = this._client.storage.guilds.get(guild.id);
		if (!await this._client.mod.hasLoggingChannel(guild)) return;
		const storage: ClientStorage = this._client.storage;

		const activeBans: ActiveBans = await storage.get('activeBans') || {};
		if (!activeBans[user.id]) activeBans[user.id] = [];
		activeBans[user.id].push({
			user: user.id,
			raw: `${user.username}#${user.discriminator}`,
			guild: guild.id,
			guildName: guild.name,
			timestamp: new Date().getTime()
		});
		await storage.set('activeBans', activeBans);

		await this._client.mod.logs.logCase(
			user,
			guild,
			'Ban',
			`Use \`${await guildStorage.settings.get('prefix')}reason ${
				await guildStorage.settings.get('cases') + 1} <...reason>\` to set a reason for this ban`,
			this._client.user);
	}

	/**
	 * Handle guild member unban event
	 */
	private async _onGuildBanRemove(guild: Guild, user: User): Promise<void>
	{
		let guildStorage: GuildStorage = this._client.storage.guilds.get(guild.id);
		if (!await this._client.mod.hasLoggingChannel(guild)) return;
		const storage: ClientStorage = this._client.storage;

		const activeBans: ActiveBans = await storage.get('activeBans') || {};
		const bans: BanObject[] = activeBans[user.id];
		if (bans)
		{
			const activeIndex: int = bans.findIndex(ban => ban.guild === guild.id);
			bans.splice(activeIndex, 1);

			if (bans.length === 0) delete activeBans[user.id];
			else activeBans[user.id] = bans;

			await storage.set('activeBans', activeBans);
		}

		await this._client.mod.logs.logCase(
			user,
			guild,
			'Unban',
			`Use \`${await guildStorage.settings.get('prefix')}reason ${
				await guildStorage.settings.get('cases') + 1} <...reason>\` to set a reason for this unban`,
			this._client.user);

		// Try to remove an active appeal for the user if there
		// was one in the guild
		const activeAppeals: ActiveAppeals = await storage.get('activeAppeals') || {};
		if (!activeAppeals[user.id]) return;

		const appealsChannel: TextChannel = <TextChannel> guild.channels
			.get(await guildStorage.settings.get('appeals'));

		try
		{
			const appeal: Message = <Message> await appealsChannel.fetchMessage(activeAppeals[user.id]);
			await storage.remove(`activeAppeals.${user.id}`);
			appeal.delete();
			if (activeAppeals[user.id])
			{
				const invite: Invite = await guild.defaultChannel
					.createInvite({ maxAge: 86400, maxUses: 1 });
				await user.send(`Your appeal has been approved. You have been unbanned from ${
					guild.name}. You may rejoin using this invite:\n${invite.url}`);
			}
		}
		catch (err)
		{
			console.log(err);
			return;
		}
	}
}
