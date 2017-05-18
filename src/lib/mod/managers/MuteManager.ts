import { GuildStorage } from 'yamdbf/bin';
import { GuildMember, Guild, Collection } from 'discord.js';
import { KeyedStorage, JSONProvider } from 'yamdbf';
import { ModClient } from '../../ModClient';

/**
 * Contains methods for managing guild member mutes
 */
export class MuteManager
{
	private _storage: KeyedStorage;
	private _client: ModClient;
	public constructor(client: ModClient)
	{
		this._storage = new KeyedStorage('managers/mute', JSONProvider);
		this._client = client;
	}

	/**
	 * Initialize the storage for this manager
	 */
	public async init(): Promise<void>
	{
		await this._storage.init();
	}

	/**
	 * Store or update a mute object for a member being muted
	 */
	public async set(member: GuildMember, duration?: int): Promise<void>
	{
		let guild: Guild = member.guild;
		let mute: MuteObject;
		if (await this.isMuted(member)) mute = await this.getMute(member);
		else mute = {
			member: member.user.id,
			guild: guild.id
		};
		if (duration) mute.expires = Date.now() + duration;
		await this._storage.set(`${guild.id}.${member.id}`, mute);
	}

	/**
	 * Add the `leftGuild` flag to a member's mute object
	 */
	public async setEvasionFlag(member: GuildMember): Promise<void>
	{
		if (!await this.isMuted(member)) return;
		await this._storage.set(`${member.guild.id}.${member.user.id}.leftGuild`, true);
	}

	/**
	 * Remove the `leftGuild` flag from a member's mute object
	 */
	public async clearEvasionFlag(member: GuildMember): Promise<void>
	{
		if (!await this.isMuted(member)) return;
		await this._storage.remove(`${member.guild.id}.${member.user.id}.leftGuild`);
	}

	/**
	 * Return whether or not a member is flagged for mute evasion
	 */
	public async isEvasionFlagged(member: GuildMember): Promise<boolean>
	{
		if (!await this.isMuted(member)) return false;
		return await this._storage.exists(`${member.guild.id}.${member.user.id}.leftGuild`)
			&& await this._storage.get(`${member.guild.id}.${member.user.id}.leftGuild`);
	}

	/**
	 * Remove a mute from storage
	 */
	public async remove(member: GuildMember): Promise<void>
	{
		await this._storage.remove(`${member.guild.id}.${member.user.id}`);
	}

	/**
	 * Returns whether or not the member currently has a stored mute
	 */
	public async isMuted(member: GuildMember): Promise<boolean>
	{
		return await this._storage.exists(`${member.guild.id}.${member.user.id}`);
	}

	/**
	 * Returns whether or not the member currently has the mute role
	 */
	public async hasMuteRole(member: GuildMember): Promise<boolean>
	{
		const storage: GuildStorage = this._client.storage.guilds.get(member.guild.id);
		if (!await storage.settings.exists('mutedrole')) return false;
		if (member.roles.has(await storage.settings.get('mutedrole'))) return true;
		return false;
	}

	/**
	 * Returns the mute object for the muted member
	 */
	public async getMute(member: GuildMember): Promise<MuteObject>
	{
		if (!await this.isMuted(member)) return null;
		return await this._storage.get(`${member.guild.id}.${member.user.id}`);
	}

	/**
	 * Returns whether or not a mute for a member is expired
	 */
	public async isExpired(member: GuildMember): Promise<boolean>
	{
		if (!await this.isMuted(member)) return null;
		const mute: MuteObject = await this.getMute(member);
		const storage: GuildStorage = this._client.storage.guilds.get(member.guild.id);
		const mutedRole: string = await storage.settings.get('mutedrole');
		return (mutedRole && !member.roles.has(mutedRole)) || Date.now() > mute.expires;
	}

	/**
	 * Returns the remaining duration for a member's mute
	 */
	public async getRemaining(member: GuildMember): Promise<int>
	{
		if (!await this.isMuted(member)) return null;
		const mute: MuteObject = await this.getMute(member);
		return mute.expires - Date.now();
	}

	/**
	 * Returns a collection of muted members within a guild
	 */
	public async getMutedMembers(guild: Guild): Promise<Collection<string, GuildMember | string>>
	{
		const ids: string[] = Object.keys(await this._storage.get(guild.id) || {});
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
