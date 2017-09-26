import { ClientStorage, GuildStorage, Message, ListenerUtil, Logger, logger } from 'yamdbf';
import { TextChannel, Guild, GuildMember, User, Invite } from 'discord.js';
import { MuteManager } from './managers/MuteManager';
import { ModClient } from '../ModClient';
import { stringResource as res } from '../Util';

const { on, registerListeners } = ListenerUtil;

/**
 * Handles received moderation related client events
 */
export class Events
{
	@logger private readonly logger: Logger;
	private _client: ModClient;
	public constructor(client: ModClient)
	{
		this._client = client;
		registerListeners(this._client, this);
	}

	/**
	 * Handle mute being applied to a guild member
	 */
	@on('guildMemberUpdate')
	private async _onGuildMemberUpdate(oldMember: GuildMember, newMember: GuildMember): Promise<void>
	{
		const guildStorage: GuildStorage = this._client.storage.guilds.get(oldMember.guild.id);
		if (!guildStorage) return;
		if (!await guildStorage.settings.exists('mutedrole')) return;
		const mutedRole: string = await guildStorage.settings.get('mutedrole');
		if (!(!oldMember.roles.has(mutedRole) && newMember.roles.has(mutedRole))) return;

		const guild: Guild = newMember.guild;
		const member: GuildMember = newMember;
		if (!await this._client.mod.hasLoggingChannel(guild)) return;
		if (member.roles.has(await guildStorage.settings.get('modrole'))) return;
		const user: User = member.user;

		this._client.mod.managers.mute.set(member);
		try { await user.send(`You've been muted in ${guild.name}`); } catch {}
		this.logger.log('Events', `Muted user: '${user.tag}' in '${guild.name}'`);

		if (this._client.mod.logs.isCaseCached(guild, user, 'Mute'))
			return this._client.mod.logs.removeCachedCase(guild, user, 'Mute');

		const prefix: string = await guildStorage.settings.get('prefix');
		const caseNum: string = (<int> await guildStorage.settings.get('cases') + 1).toString();
		const reason: string = res('STR_DEFAULT_CASE_REASON', { prefix: prefix, caseNum: caseNum });
		await this._client.mod.logs.logCase( user, guild, 'Mute', reason, this._client.user);
	}

	/**
	 * Handle potential mute evasion
	 */
	@on('guildMemberRemove')
	private async _onGuildMemberRemove(member: GuildMember): Promise<void>
	{
		const storage: GuildStorage = this._client.storage.guilds.get(member.guild.id);
		if (!member.roles.has(await storage.settings.get('mutedrole'))) return;

		const user: User = member.user;
		this._client.mod.managers.mute.setEvasionFlag(member);
		this.logger.log('Events', `Potential mute evasion: '${user.tag}' in '${member.guild.name}'`);
	}

	/**
	 * Handle member joining, check if they were flagged for
	 * mute evasion and reassign the muted role if so
	 */
	@on('guildMemberAdd')
	private async _onGuildMemberAdd(member: GuildMember): Promise<void>
	{
		const storage: GuildStorage = this._client.storage.guilds.get(member.guild.id);
		const muteManager: MuteManager = this._client.mod.managers.mute;
		if (!await muteManager.isMuted(member)) return;
		if (!await muteManager.isEvasionFlagged(member)) return;

		const mutedRole: string = await storage.settings.get('mutedrole');
		(<any> member)._roles.push(mutedRole);
		await member.setRoles((<any> member)._roles);
		muteManager.clearEvasionFlag(member);
	}

	/**
	 * Handle guild member ban event
	 */
	@on('guildBanAdd')
	private async _onGuildBanAdd(guild: Guild, user: User): Promise<void>
	{
		const guildStorage: GuildStorage = this._client.storage.guilds.get(guild.id);
		const storage: ClientStorage = this._client.storage;

		const activeBans: ActiveBans = await storage.get('activeBans') || {};
		if (!activeBans[user.id]) activeBans[user.id] = [];
		activeBans[user.id].push({
			user: user.id,
			raw: user.tag,
			guild: guild.id,
			guildName: guild.name,
			timestamp: new Date().getTime()
		});
		await storage.set('activeBans', activeBans);

		if (this._client.mod.logs.isCaseCached(guild, user, 'Ban'))
			return this._client.mod.logs.removeCachedCase(guild, user, 'Ban');

		if (!await this._client.mod.hasLoggingChannel(guild)) return;

		const prefix: string = await guildStorage.settings.get('prefix');
		const caseNum: string = (<int> await guildStorage.settings.get('cases') + 1).toString();
		const reason: string = res('STR_DEFAULT_CASE_REASON', { prefix: prefix, caseNum: caseNum });
		await this._client.mod.logs.logCase( user, guild, 'Ban', reason, this._client.user);
	}

	/**
	 * Handle guild member unban event
	 */
	@on('guildBanRemove')
	private async _onGuildBanRemove(guild: Guild, user: User): Promise<void>
	{
		const guildStorage: GuildStorage = this._client.storage.guilds.get(guild.id);
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

		// Try to remove an active appeal for the user if there
		// was one in the guild
		const activeAppeals: ActiveAppeals = await storage.get('activeAppeals') || {};
		if (activeAppeals[user.id])
		{
			const appealsChannel: TextChannel = <TextChannel> guild.channels
				.get(await guildStorage.settings.get('appeals'));

			try
			{
				const appeal: Message = <Message> await appealsChannel.fetchMessage(activeAppeals[user.id]);
				await storage.remove(`activeAppeals.${user.id}`);
				appeal.delete();
				if (activeAppeals[user.id])
				{
					const invite: Invite = await guild.defaultChannel.createInvite({ maxAge: 86400, maxUses: 1 });
					await user.send(res('MSG_DM_APPROVED_APPEAL', { guildName: guild.name, invite: invite.url }));
				}
			}
			catch (err)
			{
				await storage.remove(`activeAppeals.${user.id}`);
				this.logger.error('Events', err);
			}
		}

		if (this._client.mod.logs.isCaseCached(guild, user, 'Unban'))
			return this._client.mod.logs.removeCachedCase(guild, user, 'Unban');

		if (!await this._client.mod.hasLoggingChannel(guild)) return;

		const prefix: string = await guildStorage.settings.get('prefix');
		const caseNum: string = (<int> await guildStorage.settings.get('cases') + 1).toString();
		const reason: string = res('STR_DEFAULT_CASE_REASON', { prefix: prefix, caseNum: caseNum });
		await this._client.mod.logs.logCase(user, guild, 'Unban', reason, this._client.user);
	}
}
