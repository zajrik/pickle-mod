'use strict';
import Time from './Time';
import { Bot } from 'yamdbf';
import { GuildChannel, Guild } from 'discord.js';

export default class ModActions
{
	private _bot: Bot;
	private _mutedOverwrites: any;

	public constructor(bot: Bot)
	{
		this._bot = bot;
		this._mutedOverwrites = {
			SEND_MESSAGES: false,
			SEND_TTS_MESSAGES: false,
			EMBED_LINKS: false,
			ATTACH_FILES: false,
			SPEAK: false
		};

		this._bot.on('channelCreate', async (channel: GuildChannel) =>
		{
			if (!channel.guild) return;
			if (channel.type === 'text' && !channel.permissionsFor(this._bot.user)
				.hasPermission('MANAGE_ROLES_OR_PERMISSIONS')) return;
			console.log(`Setting 'Muted' role permissions in channel: ${channel.guild.name}/${channel.name}`);
			channel.overwritePermissions(channel.guild.roles.find('name', 'Muted'), this._mutedOverwrites)
				.catch(console.log);
		});

		this._bot.on('guildCreate', (guild: Guild) =>
		{
			guild.owner.sendMessage(`Hello! I'm here to help you with your server moderation needs! To get started, in a text channel on your server that I would have 'read messages' permissions, execute the command \`?init\`. I'll tell you when I'm done setting up my business on your server. From there, should you choose, you can change my command prefix using \`?setprefix <prefix>\` from within your server.\n\nUse \`?help\` from within a server text channel to see the commands available for server moderation.`);
		});

		this._createMuteTimer();
	}

	public async initGuild(guild: Guild)
	{
		if (!guild.roles.find('name', 'Muted')) await guild.createRole({ name: 'Muted' });
		if (!guild.roles.find('name', 'Mod')) await guild.createRole({ name: 'Mod' });
		if (!guild.channels.find('name', 'mod-logs')) await guild.createChannel('mod-logs', 'text');
		if (!guild.channels.find('name', 'ban-appeals')) await guild.createChannel('ban-appeals', 'text');
		await guild.channels.find('name', 'mod-logs')
			.overwritePermissions(guild.roles.find('name', '@everyone'), { SEND_MESSAGES: false });
		await guild.channels.find('name', 'mod-logs')
			.overwritePermissions(guild.roles.find('name', 'YAMDBF Mod'), { SEND_MESSAGES: true });
		await guild.channels.find('name', 'ban-appeals')
			.overwritePermissions(guild.roles.find('name', '@everyone'), { SEND_MESSAGES: false, READ_MESSAGES: false });
		await guild.channels.find('name', 'ban-appeals')
			.overwritePermissions(guild.roles.find('name', 'Mod'), { SEND_MESSAGES: true, READ_MESSAGES: true });
		await guild.channels.find('name', 'ban-appeals')
			.overwritePermissions(guild.roles.find('name', 'YAMDBF Mod'), { SEND_MESSAGES: true, READ_MESSAGES: true });
		for (let channel of guild.channels.values())
		{
			if (!guild.roles.find('name', 'Muted')) return;
			if (!channel.permissionOverwrites.get(guild.roles.find('name', 'Muted').id)
				&& channel.permissionsFor(this._bot.user).hasPermission('MANAGE_ROLES_OR_PERMISSIONS'))
			{
				console.log(`Setting 'Muted' role permissions in channel: ${channel.guild.name}/${channel.name}`);
				await channel.overwritePermissions(guild.roles.find('name', 'Muted'), this._mutedOverwrites);
			}
		}
	}

	private _createMuteTimer()
	{
		this._bot.setInterval(async () =>
		{

		}, 60000);
	}
}