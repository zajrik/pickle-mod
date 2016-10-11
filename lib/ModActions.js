'use strict';

exports.default = class ModActions
{
	constructor(bot)
	{
		this.bot = bot;

		this.bot.on('channelCreate', channel =>
		{
			this.updateGuilds();
		});

		this.bot.on('guildCreate', guild =>
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
		}
		this.bot.guilds.forEach(guild =>
		{
			// Create Muted role and apply permissions
			if (!guild.roles.find('name', 'Muted'))
			{
				console.log(`Creating 'Muted' role for guild: ${guild.name}`);
				guild.createRole({name: 'Muted'})
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
				guild.createRole({name: 'Mod'}).catch(console.log);
			}
		});
	}

	mute(user, guild)
	{

	}

	unmute(user, guild)
	{

	}

	kick(user, guild)
	{

	}

	ban(user, guild)
	{

	}

	unban(user, guild)
	{

	}

	softBan(user, guild)
	{

	}
}
