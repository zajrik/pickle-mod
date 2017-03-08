import { GuildStorage } from 'yamdbf/bin';
import { GuildMember, Guild, Collection } from 'discord.js';
import { LocalStorage } from 'yamdbf';
import ModBot from '../../ModBot';

/**
 * Contains methods for managing guild member mutes
 */
export class MuteManager
{
	private _storage: LocalStorage;
	private _bot: ModBot;
	public constructor(bot: ModBot)
	{
		this._storage = new LocalStorage('storage/managers/mute');
		this._bot = bot;
	}

	/**
	 * Store or update a mute object for a member being muted
	 */
	public async set(member: GuildMember, duration?: int): Promise<void>
	{
		let guild: Guild = member.guild;
		let mute: MuteObject;
		if (this.isMuted(member)) mute = this.getMute(member);
		else mute = {
			member: member.user.id,
			guild: guild.id
		};
		if (duration) mute.expires = Date.now() + duration;
		await this._storage.queue(`${guild.id}/${member.id}`, async key =>
		{
			this._storage.setItem(key, mute);
		});
	}

	/**
	 * Add the `leftGuild` flag to a member's mute object
	 */
	public setEvasionFlag(member: GuildMember): void
	{
		if (!this.isMuted(member)) return;
		this._storage.setItem(`${member.guild.id}/${member.user.id}/leftGuild`, true);
	}

	/**
	 * Remove the `leftGuild` flag from a member's mute object
	 */
	public clearEvasionFlag(member: GuildMember): void
	{
		if (!this.isMuted(member)) return;
		this._storage.removeItem(`${member.guild.id}/${member.user.id}/leftGuild`);
	}

	/**
	 * Return whether or not a member is flagged for mute evasion
	 */
	public isEvasionFlagged(member: GuildMember): boolean
	{
		if (!this.isMuted(member)) return false;
		return this._storage.exists(`${member.guild.id}/${member.user.id}/leftGuild`)
			&& this._storage.getItem(`${member.guild.id}/${member.user.id}/leftGuild`);
	}

	/**
	 * Remove a mute from storage
	 */
	public remove(member: GuildMember): void
	{
		this._storage.removeItem(`${member.guild.id}/${member.user.id}`);
	}

	/**
	 * Returns whether or not the member currently has a stored mute
	 */
	public isMuted(member: GuildMember): boolean
	{
		return this._storage.exists(`${member.guild.id}/${member.user.id}`);
	}

	/**
	 * Returns the mute object for the muted member
	 */
	public getMute(member: GuildMember): MuteObject
	{
		if (!this.isMuted(member)) return null;
		return this._storage.getItem(`${member.guild.id}/${member.user.id}`);
	}

	/**
	 * Returns whether or not a mute for a member is expired
	 */
	public isExpired(member: GuildMember): boolean
	{
		if (!this.isMuted(member)) return null;
		const mute: MuteObject = this.getMute(member);
		const storage: GuildStorage = this._bot.guildStorages.get(member.guild);
		const mutedRole: string = storage.getSetting('mutedrole');
		return (mutedRole && !member.roles.has(mutedRole)) || Date.now() > mute.expires;
	}

	/**
	 * Returns the remaining duration for a member's mute
	 */
	public getRemaining(member: GuildMember): int
	{
		if (!this.isMuted(member)) return null;
		const mute: MuteObject = this.getMute(member);
		return mute.expires - Date.now();
	}

	/**
	 * Returns a collection of muted members within a guild
	 */
	public async getMutedMembers(guild: Guild): Promise<Collection<string, GuildMember | string>>
	{
		const ids: string[] = Object.keys(this._storage.getItem(guild.id) || {});
		let mutedMembers: Collection<string, GuildMember | string> = new Collection<string, GuildMember | string>();
		for (const id of ids)
		{
			let member: GuildMember | string;
			try { member = guild.member(id) || await guild.fetchMember(id); }
			catch (err) { member = id; }
			mutedMembers.set(id, member);
		}
		return mutedMembers;
	}
}
