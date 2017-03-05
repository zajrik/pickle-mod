import { Command, Message, Middleware } from 'yamdbf';
import { TextChannel, GuildChannel, Role, RichEmbed } from 'discord.js';
import ModLoader from '../../lib/mod/Loader';
import ModBot from '../../lib/ModBot';
import { prompt, PromptResult } from '../../lib/Util';

export default class Config extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'config',
			aliases: [],
			description: 'Configure options for the server',
			usage: '<prefix>config <option> [...value]\nOptions: mod | mute | logs | appeals | status | reset',
			extraHelp: 'Uses a fuzzy-ish search to find channels and roles. For example, if you want to set your logging channel to a channel called "mod-logs" you can do:\n\n\t<prefix>config mod mod logs',
			group: 'mod',
			guildOnly: true,
			argOpts: { separator: ' ' }
		});

		this.use(Middleware.resolveArgs({ '<option>': 'String', '[...value]': 'String' }));
		this.use(Middleware.expect({ '<option>': 'String' }));
	}

	public async action(message: Message, [option, value]: string[]): Promise<any>
	{
		if (!(this.bot.config.owner.includes(message.author.id)
			|| (<TextChannel> message.channel).permissionsFor(message.member)
				.hasPermission('MANAGE_GUILD')))
			return message.channel.send('You must have `Manage Server` permissions to use this command.');

		if (!/^(?:mod|mute|logs|appeals|status|reset)$/i.test(option))
			return message.channel.send(`Invalid option: \`${option}\`\nUsage: \`${this.usage}\``);

		const mod: ModLoader = this.bot.mod;
		let [modRoleSet, logs, appeals, mute]: boolean[] = [
			mod.hasSetModRole(message.guild),
			mod.hasLoggingChannel(message.guild),
			mod.hasAppealsChannel(message.guild),
			mod.hasSetMutedRole(message.guild)
		];

		function check(bool: boolean): string
		{
			return bool ? '\\✅' : '\\❌';
		}

		function normalize(text: string): string
		{
			return text.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
		}

		switch (option.toLowerCase())
		{
			case 'mod':
				const modRole: Role = message.guild.roles.find((role: Role) =>
					normalize(role.name) === normalize(value));
				if (!modRole) return message.channel.send(`Couldn't find role \`${value}\``);
				message.guild.storage.setSetting('modrole', modRole.id);
				return message.channel.send(`Set mod role to ${modRole}`);

			case 'mute':
				const mutedRole: Role = message.guild.roles.find((role: Role) =>
					normalize(role.name) === normalize(value));
				if (!mutedRole) return message.channel.send(`Couldn't find role \`${value}\``);
				message.guild.storage.setSetting('mutedrole', mutedRole.id);
				return message.channel.send(`Set muted role to ${mutedRole}`);

			case 'logs':
				const logsChannel: GuildChannel = message.guild.channels.find((channel: GuildChannel) =>
					normalize(channel.name) === normalize(value));
				if (!logsChannel) return message.channel.send(`Couldn't find channel \`${value}\``);
				message.guild.storage.setSetting('modlogs', logsChannel.id);
				return message.channel.send(`Set logs channel to ${logsChannel}`);

			case 'appeals':
				const appealsChannel: GuildChannel = message.guild.channels.find((channel: GuildChannel) =>
					normalize(channel.name) === normalize(value));
				if (!appealsChannel) return message.channel.send(`Couldn't find channel \`${value}\``);
				message.guild.storage.setSetting('appeals', appealsChannel.id);
				return message.channel.send(`Set appeals channel to ${appealsChannel}`);

			case 'status':
				const embed: RichEmbed = new RichEmbed()
					.setColor(0xEFEAEA)
					.setAuthor('Server config status', this.bot.user.avatarURL)
					.setDescription(`${check(modRoleSet)} **Mod role\n${check(logs)} Logs channel\n`
						+ `${check(appeals)} Appeals channel\n${check(mute)} Mute role**`);
				return message.channel.sendEmbed(embed);

			case 'reset':
				const [result]: [PromptResult] = <[PromptResult]> await prompt(
					message, 'Are you sure you want to reset config? (__y__es | __n__o)', /^(?:yes|y)$/i);
				if (result === PromptResult.TIMEOUT) return message.channel.send('Command timed out, aborting config reset.');
				if (result === PromptResult.FAILURE) return message.channel.send('Okay, aborting config reset.');

				for (const setting of ['modrole', 'mutedrole', 'modlogs', 'appeals'])
					message.guild.storage.removeSetting(setting);

				return message.channel.send(
					`Server config reset. You'll need to reconfigure to be able to use mod commands again.`);
		}
	}
}
