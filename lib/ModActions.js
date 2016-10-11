'use strict';

exports.default = class ModActions
{
	constructor(bot)
	{
		this.bot = bot;

		this.bot.on('channelCreate', () =>
		{
			this.updateGuilds();
		});

		this.bot.on('guildCreate', () =>
		{
			this.updateGuilds();
		});
	}

	updateGuilds()
	{
		const mutedOverwrites = {
			SEND_MESSAGES: false,
			SEND_TTS_MESSAGES: false,
			EMBED_LINKS: false,
			ATTACH_FILES: false,
			SPEAK: false
		};
		this.bot.guilds.forEach(guild =>
		{
			// Create Muted role and apply permissions
			if (!guild.roles.find('name', 'Muted'))
			{
				console.log(`Creating 'Muted' role for guild: ${guild.name}`);
				guild.createRole({ name: 'Muted' })
					.then(role =>
					{
						guild.channels.forEach(channel =>
						{
							if (!channel.permissionsFor(this.bot.user.id).hasPermission('MANAGE_ROLES_OR_PERMISSIONS')) return;
							console.log(`Setting 'Muted' role permissions in channel: ${guild.name}/${channel.name}`);
							channel.overwritePermissions(role, mutedOverwrites).catch(console.log);
						});
					}).catch(console.log);
			}

			// Apply Muted role permissions to channels that don't have them yet
			guild.channels.forEach(channel =>
			{
				if (!guild.roles.find('name', 'Muted')) return;
				if (!channel.permissionOverwrites.get(guild.roles.find('name', 'Muted').id)
					&& channel.permissionsFor(this.bot.user.id).hasPermission('MANAGE_ROLES_OR_PERMISSIONS'))
				{
					console.log(`Setting 'Muted' role permissions in channel: ${channel.name}`);
					channel.overwritePermissions(guild.roles.find('name', 'Muted'), mutedOverwrites)
						.catch(console.log);
				}
			});

			// Create Mod role if it doesn't exist. Just a basic role
			// for allowing access to commands with the 'Mod' role set.
			// Permissions can be customized per guild if the role is to
			// be utilized for more than just modbot access, of course
			if (!guild.roles.find('name', 'Mod'))
			{
				console.log(`Creating 'Mod' role for guild: ${guild.name}`);
				guild.createRole({ name: 'Mod' }).catch(console.log);
			}
		});
	}

	// Increment the number of times the given user has
	// received a given type of formal moderation action
	count(user, guild, type)
	{
		let storage = this.bot.guildStorages.get(guild);
		let count = storage.getItem(type);
		if (!count)
		{
			count = {};
			count[user.id || user] = 0;
		}
		count[user.id || user]++;
		storage.setItem(type, count);
	}

	warn(user, guild)
	{
		// TODO: Send info to mod-log, dm user warning details
		this.count(user, guild, 'warnings');
	}

	mute(user, guild)
	{
		// TODO: Send info to mod-log, dm user mute details
		this.count(user, guild, 'mutes');
		let member = guild.members.get(user.id || user);
		return member.addRole(guild.roles.find('name', 'Muted'));
	}

	unmute(user, guild)
	{
		// TODO: dm user, notify of unmute
		let member = guild.members.get(user.id || user);
		return member.removeRole(guild.roles.find('name', 'Muted'));
	}

	kick(user, guild)
	{
		// TODO: notify user of kick, give rejoin information
		this.count(user, guild, 'kicks');
		let member = guild.members.get(user.id || user);
		return member.kick();
	}

	ban(user, guild)
	{
		// TODO: dm user, give appeal information
		this.count(user, guild, 'bans');
		let member = guild.members.get(user.id || user);
		return guild.ban(member, 7);
	}

	unban(id, guild)
	{
		// TODO: notify user of unban, give rejoin information
		return guild.unban(id);
	}

	softBan(user, guild)
	{
		// TODO: notify user of kick, give rejoin information
		let member = guild.members.get(user.id || user);
		return guild.ban(member, 7).then(user = guild.unban(user.id));
	}
};
