import ModBot from '../ModBot';
import { LocalStorage, GuildStorage, Message } from 'yamdbf';
import { TextChannel, Guild, GuildMember, User, Invite } from 'discord.js';

/**
 * Handles received moderation related client events
 */
export default class Events
{
	private _bot: ModBot;

	public constructor(bot: ModBot)
	{
		this._bot = bot;

		this._bot.on('guildBanAdd', (guild: Guild, user: User) => this._onGuildBanAdd(guild, user));
		this._bot.on('guildBanRemove', async (guild: Guild, user: User) => this._onGuildBanRemove(guild, user));
		this._bot.on('guildMemberUpdate', async (oldMember: GuildMember, newMember: GuildMember) =>
		{
			const storage: GuildStorage = this._bot.guildStorages.get(oldMember.guild.id);
			if (!storage.settingExists('mutedrole')) return;
			const mutedRole: string = storage.getSetting('mutedrole');
			if (!oldMember.roles.has(mutedRole) && newMember.roles.has(mutedRole))
				this._onGuildMuteAdd(newMember.guild, newMember);
		});
		this._bot.on('guildMemberRemove', (member: GuildMember) => this._onGuildMemberRemove(member));
		this._bot.on('guildMemberAdd', (member: GuildMember) => this._onGuildMemberAdd(member));
	}

	/**
	 * Handle guildmember being muted
	 */
	private async _onGuildMuteAdd(guild: Guild, member: GuildMember): Promise<void>
	{
		const settings: GuildStorage = this._bot.guildStorages.get(guild);
		if (!this._bot.mod.hasLoggingChannel(guild)) return;
		if (member.roles.has(settings.getSetting('modrole'))) return;
		const storage: LocalStorage = this._bot.storage;
		const user: User = member.user;

		await storage.queue('activeMutes', (key: string) =>
		{
			let activeMutes: ActiveMutes = storage.getItem(key) || {};
			if (!activeMutes[user.id]) activeMutes[user.id] = [];
			const activeIndex: int = activeMutes[user.id].findIndex(a => a.guild === guild.id);
			const mute: MuteObject = {
				raw: `${user.username}#${user.discriminator}`,
				user: user.id,
				guild: guild.id,
				timestamp: Date.now()
			};
			if (activeIndex > -1) activeMutes[user.id][activeIndex] = mute;
			else activeMutes[user.id].push(mute);
			storage.setItem(key, activeMutes);
			user.send(`You've been muted in ${guild.name}`);
			console.log(`Muted user '${user.username}#${user.discriminator}' in ${guild.name}`);
		});

		await this._bot.mod.logger.caseLog(
			user,
			guild,
			'Mute',
			`Use \`${settings.getSetting('prefix')}reason ${settings.getSetting('cases') + 1} <reason text>\` to set a reason for this mute`,
			this._bot.user);
	}

	/**
	 * Handle potential mute evasion
	 */
	private async _onGuildMemberRemove(member: GuildMember): Promise<void>
	{
		const settings: GuildStorage = this._bot.guildStorages.get(member.guild);
		if (!member.roles.has(settings.getSetting('mutedrole'))) return;

		const storage: LocalStorage = this._bot.storage;
		const user: User = member.user;

		await storage.queue('activeMutes', (key: string) =>
		{
			let activeMutes: ActiveMutes = storage.getItem('activeMutes') || {};
			if (!activeMutes[user.id]) return;
			const activeIndex: int = activeMutes[user.id].findIndex(a => a.guild === member.guild.id);
			if (activeIndex === -1) return;

			activeMutes[user.id][activeIndex].leftGuild = true;
			storage.setItem(key, activeMutes);
			console.log(`Potential mute evasion: '${user.username}#${user.discriminator}' in ${member.guild.name}`);
		});
	}

	/**
	 * Handle member joining, check if they left the guild
	 * while muted and reassign the muted role if so
	 */
	private async _onGuildMemberAdd(member: GuildMember): Promise<void>
	{
		const settings: GuildStorage = this._bot.guildStorages.get(member.guild);
		const storage: LocalStorage = this._bot.storage;
		const user: User = member.user;

		await storage.queue('activeMutes', (key: string) =>
		{
			let activeMutes: ActiveMutes = storage.getItem('activeMutes') || {};
			if (!activeMutes[user.id]) return;
			const activeIndex: int = activeMutes[user.id].findIndex(a => a.guild === member.guild.id);
			if (activeIndex === -1) return;
			if (!activeMutes[user.id][activeIndex].leftGuild) return;

			const mutedRole: string = settings.getSetting('mutedrole');
			(<any> member)._roles.push(mutedRole);
			member.addRoles([member.guild.roles.get(mutedRole)]);
			delete activeMutes[user.id][activeIndex].leftGuild;
			storage.setItem(key, activeMutes);
		});
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
		await storage.queue('activeBans', (key: string) =>
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
		await storage.queue('activeBans', (key: string) =>
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
		await storage.queue('activeAppeals', async (key: string) =>
		{
			const activeAppeals: ActiveAppeals = storage.getItem(key) || {};
			const appealsChannel: TextChannel = <TextChannel> guild.channels
				.get(settings.getSetting('appeals'));
			try
			{
				const appeal: Message = <Message> await appealsChannel.fetchMessage(activeAppeals[user.id]);
				appeal.delete();
				if (activeAppeals[user.id])
				{
					const invite: Invite = await guild.defaultChannel
						.createInvite({ maxAge: 72 * 1000 * 60 * 60, maxUses: 1 });
					await user.send(`Your appeal has been approved. You have been unbanned from ${
						guild.name}. You may rejoin using this invite:\n${invite.url}`);
				}
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
