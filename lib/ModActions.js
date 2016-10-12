'use strict';

const Time = require('./Time');

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

		this.bot.on('guildCreate', guild =>
		{
			guild.owner.sendMessage(`Hello! I'm here to help you with your server moderation needs! To get started, in a text channel on your server that I would have 'read messages' permissions, execute the command \`?init\`. I'll tell you when I'm done setting up my business on your server. From there, should you choose, you can change my command prefix using \`?setprefix <prefix>\` from within your server.\n\nUse \`?help\` from within a server text channel to see the commands available for server moderation.`);
		});

		// Check current mutes and unmute users if the mute has expired
		this.muteTimer = new Promise(() =>
		{
			setInterval(() =>
			{
				let storage = this.bot.storage;
				let activeMutes = storage.getItem('activeMutes');
				if (!activeMutes) return;
				let oldMutes = new Map(activeMutes);
				let newMutes = new Map(oldMutes);
				oldMutes.forEach((mute, key) =>
				{
					if (Time.difference(mute.duration * 1000 * 60 * 60, Time.now() - mute.timestamp).ms < 1)
					{
						let guild = this.bot.guilds.get(mute.guild);
						guild.members.get(mute.user).removeRole(guild.roles.find('name', 'Muted'));
						newMutes.delete(key);
					}
				});
				storage.setItem('activeMutes', newMutes);
			}, 1 * 1000 * 60);
		}).then(() => console.log('Mute timer task started.'));
	}

	initGuild(guild)
	{
		return Promise.resolve()
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
			{ // eslint-disable-line
				return guild.channels.find('name', 'mod-logs')
					.overwritePermissions(guild.roles.find('name', '@everyone'), { SEND_MESSAGES: false });
			})
			.then(() =>
			{ // eslint-disable-line
				return guild.channels.find('name', 'mod-logs')
					.overwritePermissions(guild.roles.find('name', 'YAMDBF Mod'), { SEND_MESSAGES: true });
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
						console.log(`Setting 'Muted' role permissions in channel: ${channel.guild.name}/${channel.name}`);
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

	// Post the moderation case to the mod-logs channel
	caseLog(user, guild, type, reason, issuer, duration)
	{
		let storage = this.bot.guildStorages.get(guild);
		let caseNum = storage.getSetting('cases') || 0;
		caseNum++;
		storage.setSetting('cases', caseNum);
		return guild.channels.find('name', 'mod-logs').sendMessage(``
			+ `**Case ${caseNum} | ${type}**\n`
			+ `\`Member:\` ${user} (${user.username}#${user.discriminator})\n`
			+ `${duration ? '\`Length:\` ' + duration + ' hours\n' : ''}` // eslint-disable-line
			+ `\`Reason:\` ${reason}\n`
			+ `\`Issuer:\` ${issuer.username}#${issuer.discriminator}`
		);
	}

	warn(user, guild)
	{
		// TODO: Send info to mod-logs, dm user warning details
		this.count(user, guild, 'warnings');
	}

	mute(user, guild)
	{
		// TODO: Send info to mod-logs, dm user mute details
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
