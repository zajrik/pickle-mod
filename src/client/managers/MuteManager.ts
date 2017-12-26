import { GuildStorage, KeyedStorage, Providers, Logger, logger } from 'yamdbf';
import { GuildMember, Guild, Collection } from 'discord.js';
import { ModClient } from '../../client/ModClient';
import { Timer } from '../../timer/Timer';
const { JSONProvider } = Providers;

/**
 * Contains methods for managing guild member mutes. Also handles
 * automatically checking for and removing expired mutes
 */
export class MuteManager
{
	@logger('MuteManager')
	private readonly _logger: Logger;
	private readonly _storage: KeyedStorage;
	private readonly _client: ModClient;
	private _muteCheckTimer: Timer;

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
		this._muteCheckTimer = new Timer(this._client, 'mute', 15, async () => this._checkMutes());
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
			try { member = await guild.fetchMember(id); }
			catch { member = id; }
			mutedMembers.set(id, member);
		}
		return mutedMembers;
	}

	/**
	 * Check active mutes and remove any that are expired
	 */
	private async _checkMutes(): Promise<void>
	{
		for (const guild of this._client.guilds.values())
		{
			const mutedRole: string = await this._client.storage.guilds.get(guild.id).settings.get('mutedrole');
			for (let member of (await this.getMutedMembers(guild)).values())
			{
				if (typeof member === 'string')
				{
					try { member = await guild.fetchMember(member); }
					catch
					{
						this._logger.error(`Error fetching member to check mute: ${member}`);
						continue;
					}
				}
				if (!await this.isExpired(member)) continue;
				if (await this.isEvasionFlagged(member)) continue;

				if (member.roles.has(mutedRole))
				{
					try { await member.removeRole(guild.roles.get(mutedRole)); }
					catch
					{
						this._logger.error(`Failed to remove expired mute: '${member.user.tag}' in '${member.guild.name}'`);
						continue;
					}
				}

				this._logger.log(`Removed expired mute: '${member.user.tag}' in '${guild.name}'`);

				await this.remove(member);
				member.send(`Your mute on ${guild.name} has been lifted. You may now send messages.`);
			}
		}
	}
}
