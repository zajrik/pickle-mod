'use strict';

exports.default = class ModActions
{
	constructor(bot)
	{
		this.bot = bot;
		this.mutedOverwrites = {
			SEND_MESSAGES: false,
			SEND_TTS_MESSAGES: false,
			EMBED_LINKS: false,
			ATTACH_FILES: false,
			SPEAK: false
		};

		this.bot.on('channelCreate', channel =>
		{
			if (!channel.permissionsFor(this.bot.user.id).hasPermission('MANAGE_ROLES_OR_PERMISSIONS')) return;
			console.log(`Setting 'Muted' role permissions in channel: ${channel.guild.name}/${channel.name}`);
			channel.overwritePermissions(channel.guild.roles.find('name', 'Muted'), this.mutedOverwrites).catch(console.log);
		});

		this.bot.on('guildCreate', () =>
		{
			// TODO: message guild owner with init instructions
		});
	}

	initGuild(guild)
	{
		let storage = this.bot.guildStorages.get(guild);
		// if (storage.getSetting('init')) return;
		storage.setSetting('init', true);

		Promise.resolve(true)
			.then(() =>
			{
				if (!guild.roles.find('name', 'Muted')) return guild.createRole({ name: 'Muted' });
				else return Promise.resolve();
			})
			.then(() =>
			{
				if (!guild.roles.find('name', 'Mod')) return guild.createRole({ name: 'Mod' });
				else return Promise.resolve();
			})
			.then(() =>
			{
				if (!guild.channels.find('name', 'mod-logs')) return guild.createChannel('mod-logs');
				else return Promise.resolve();
			})
			.then(() =>
			{
				if (!guild.channels.find('name', 'ban-appeals')) return guild.createChannel('ban-appeals');
				else return Promise.resolve();
			})
			.then(() =>
			{ //eslint-disable-line
				return guild.channels.find('name', 'mod-logs')
					.overwritePermissions(guild.roles.find('name', '@everyone'), { SEND_MESSAGES: false });
			})
			.then(() =>
			{ // eslint-disable-line
				return guild.channels.find('name', 'ban-appeals')
					.overwritePermissions(guild.roles.find('name', '@everyone'), {
						SEND_MESSAGES: false,
						READ_MESSAGES: false
					});
			})
			.then(() =>
			{ // eslint-disable-line
				return guild.channels.find('name', 'ban-appeals')
					.overwritePermissions(guild.roles.find('name', 'Mod'), {
						SEND_MESSAGES: true,
						READ_MESSAGES: true
					});
			})
			.then(() =>
			{
				guild.channels.forEach(channel =>
				{
					if (!guild.roles.find('name', 'Muted')) return;
					if (!channel.permissionOverwrites.get(guild.roles.find('name', 'Muted').id)
						&& channel.permissionsFor(this.bot.user.id).hasPermission('MANAGE_ROLES_OR_PERMISSIONS'))
					{
						console.log(`Setting 'Muted' role permissions in channel: ${channel.name}`);
						channel.overwritePermissions(guild.roles.find('name', 'Muted'), this.mutedOverwrites);
					}
				});
			})
			.catch(console.log);
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
