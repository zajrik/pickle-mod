import { GuildStorage, KeyedStorage, Providers, Logger, logger, Lang } from '@yamdbf/core';
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
	public async set(guild: Guild, member: string, duration?: int): Promise<void>
	{
		let mute: MuteObject;
		if (await this.isMuted(guild, member)) mute = await this.getMute(guild, member);
		else mute = {
			member: member,
			guild: guild.id
		};
		if (duration) mute.expires = Date.now() + duration;
		await this._storage.set(`${guild.id}.${member}`, mute);
	}

	/**
	 * Add the `leftGuild` flag to a member's mute object
	 */
	public async setEvasionFlag(guild: Guild, member: string): Promise<void>
	{
		if (!await this.isMuted(guild, member)) return;
		await this._storage.set(`${guild.id}.${member}.leftGuild`, true);
	}

	/**
	 * Remove the `leftGuild` flag from a member's mute object
	 */
	public async clearEvasionFlag(guild: Guild, member: string): Promise<void>
	{
		if (!await this.isMuted(guild, member)) return;
		await this._storage.remove(`${guild.id}.${member}.leftGuild`);
	}

	/**
	 * Return whether or not a member is flagged for mute evasion
	 */
	public async isEvasionFlagged(guild: Guild, member: string): Promise<boolean>
	{
		if (!await this.isMuted(guild, member)) return false;
		return await this._storage.exists(`${guild.id}.${member}.leftGuild`)
			&& await this._storage.get(`${guild.id}.${member}.leftGuild`);
	}

	/**
	 * Increment attempts on a stored mute object for a guild member.
	 * This can be for evaded mute reassignment attempts or mute removal
	 * attemps
	 */
	public async incrementAttempts(guild: Guild, member: string): Promise<void>
	{
		if (!this.getMute(guild, member)) return;
		let old: number = await this._storage.get(`${guild.id}.${member}.attempts`);
		await this._storage.set(`${guild.id}.${member}.attempts`, old ? old + 1 : 1);
	}

	/**
	 * Get attempts on a stored mute object for a guild member
	 */
	public async getAttempts(guild: Guild, member: string): Promise<int>
	{
		if (!this.getMute(guild, member)) return 0;
		return await this._storage.get(`${guild.id}.${member}.attempts`);
	}

	/**
	 * Remove a mute from storage
	 */
	public async remove(guild: Guild, member: string): Promise<void>
	{
		await this._storage.remove(`${guild.id}.${member}`);
	}

	/**
	 * Returns whether or not the member currently has a stored mute
	 */
	public async isMuted(guild: Guild, member: string): Promise<boolean>
	{
		return await this._storage.exists(`${guild.id}.${member}`);
	}

	/**
	 * Returns whether or not the member currently has the mute role
	 */
	public async hasMuteRole(guild: Guild, member: string): Promise<boolean>
	{
		const storage: GuildStorage = this._client.storage.guilds.get(guild.id);
		let guildMember: GuildMember;
		try { guildMember = await guild.members.fetch(member); }
		catch { return false; }

		if (!await storage.settings.exists('mutedrole')) return false;
		if (guildMember.roles.has(await storage.settings.get('mutedrole'))) return true;
		return false;
	}

	/**
	 * Returns the mute object for the muted member
	 */
	public async getMute(guild: Guild, member: string): Promise<MuteObject>
	{
		if (!await this.isMuted(guild, member)) return null;
		return await this._storage.get(`${guild.id}.${member}`);
	}

	/**
	 * Returns whether or not a mute for a member is expired
	 */
	public async isExpired(guild: Guild, member: string): Promise<boolean>
	{
		if (!await this.isMuted(guild, member)) return null;
		const mute: MuteObject = await this.getMute(guild, member);
		const storage: GuildStorage = this._client.storage.guilds.get(guild.id);
		const mutedRole: string = await storage.settings.get('mutedrole');

		let guildMember: GuildMember;
		try { guildMember = await guild.members.fetch(member); }
		catch {}

		return (mutedRole && (guildMember && !guildMember.roles.has(mutedRole))) || Date.now() > mute.expires;
	}

	/**
	 * Returns the remaining duration for a member's mute
	 */
	public async getRemaining(guild: Guild, member: string): Promise<int>
	{
		if (!await this.isMuted(guild, member)) return null;
		const mute: MuteObject = await this.getMute(guild, member);
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
			try { member = await guild.members.fetch(id); }
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
					try { member = await guild.members.fetch(member); }
					catch
					{
						if (await this.isExpired(guild, member))
						{
							this._logger.log(`Removing expired mute for invalid member: ${member} in '${guild.name}'`);
							await this.remove(guild, member);
						}
						continue;
					}
				}

				if (!await this.isExpired(guild, member.id)) continue;
				if (await this.isEvasionFlagged(guild, member.id))
				{
					if (!member.roles.has(mutedRole))
					{
						try
						{
							(<any> member)._roles.push(mutedRole);
							await member.roles.set((<any> member)._roles);
							this._logger.log(`Reassigned evaded mute: '${member.user.tag}' in '${member.guild.name}'`);
							await this.clearEvasionFlag(guild, member.id);
						}
						catch
						{
							if (await this.getAttempts(guild, member.id) < 1) this._logger.error(
								`Failed to reassign evaded mute: '${member.user.tag}' in '${member.guild.name}'`);
							(<any> member)._roles = (<any> member)._roles.filter((r: string) => r !== mutedRole);

							await this.incrementAttempts(guild, member.id);
							if (await this.getAttempts(guild, member.id) >= 4)
							{
								await this.remove(guild, member.id);
								this._logger.log(
									`Removed tracked mute: '${member.user.tag}' in '${member.guild.name}'`);

								try
								{
									await guild.owner.send(Lang.res('en_us', 'MSG_DM_INVALID_MUTE_PERMS_EVASION',
										{ guildName: guild.name, member: member.user.tag }));
								}
								catch {}
							}
						}
					}
					continue;
				}

				if (member.roles.has(mutedRole))
				{
					try { await member.roles.remove(guild.roles.get(mutedRole)); }
					catch
					{
						if (await this.getAttempts(guild, member.id) < 1) this._logger.error(
							`Failed to remove expired mute: '${member.user.tag}' in '${member.guild.name}'`);

						await this.incrementAttempts(guild, member.id);
						if (await this.getAttempts(guild, member.id) >= 4)
						{
							await this.remove(guild, member.id);
							this._logger.log(
								`Removed tracked mute: '${member.user.tag}' in '${member.guild.name}'`);

							try
							{
								await guild.owner.send(Lang.res('en_us', 'MSG_DM_INVALID_MUTE_PERMS_REMOVAL',
									{ guildName: guild.name, member: member.user.tag }));
							}
							catch {}
						}
						continue;
					}
				}

				this._logger.log(`Removed expired mute: '${member.user.tag}' in '${guild.name}'`);

				await this.remove(guild, member.id);
				member.send(`Your mute on ${guild.name} has been lifted. You may now send messages.`).catch();
			}
		}
	}
}
