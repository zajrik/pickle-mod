import { Bot, Command, Message, GuildStorage } from 'yamdbf';
import { User, TextChannel, GuildChannel, Role } from 'discord.js';

export default class Config extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'config',
			aliases: [],
			description: 'Configure options for the server',
			usage: '<prefix>config <mod|mute|logs|appeals|reset> [...args]',
			extraHelp: '',
			group: 'mod',
			guildOnly: true,
			argOpts: { stringArgs: true, separator: ' ' }
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!(<any> this.bot.config).owner.includes(message.author.id)
			|| !(<TextChannel> message.channel).permissionsFor(message.member)
				.hasPermission('MANAGE_GUILD'))
			return;

		const option: string = (<string> args.shift()).toLowerCase();
		if (!option) return message.channel.sendMessage('You must provide an option.');
		if (!/^(?:mod|mute|logs|appeals|reset)$/.test(option))
			return message.channel.sendMessage(`Invalid option: \`${option}\``);

		function normalize(text: string): string
		{
			return text.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
		}

		const value: string = args.join(' ');
		switch (option)
		{
			case 'mod':
				const modRole: Role = message.guild.roles.find((role: Role) =>
					normalize(role.name) === normalize(value));
				if (!modRole) return message.channel.sendMessage(`Couldn't find role \`${value}\``);
				message.guild.storage.setSetting('modrole', modRole.id);
				return message.channel.sendMessage(`Set mod role to ${modRole}`);

			case 'mute':
				const mutedRole: Role = message.guild.roles.find((role: Role) =>
					normalize(role.name) === normalize(value));
				if (!mutedRole) return message.channel.sendMessage(`Couldn't find role \`${value}\``);
				message.guild.storage.setSetting('mutedrole', mutedRole.id);
				return message.channel.sendMessage(`Set muted role to ${mutedRole}`);

			case 'logs':
				const logsChannel: GuildChannel = message.guild.channels.find((channel: GuildChannel) =>
					normalize(channel.name) === normalize(value));
				if (!logsChannel) return message.channel.sendMessage(`Couldn't find channel \`${value}\``);
				message.guild.storage.setSetting('modlogs', logsChannel.id);
				return message.channel.sendMessage(`Set logs channel to ${logsChannel}`);

			case 'appeals':
				const appealsChannel: GuildChannel = message.guild.channels.find((channel: GuildChannel) =>
					normalize(channel.name) === normalize(value));
				if (!appealsChannel) return message.channel.sendMessage(`Couldn't find channel \`${value}\``);
				message.guild.storage.setSetting('appeals', appealsChannel.id);
				return message.channel.sendMessage(`Set appeals channel to ${appealsChannel}`);

			case 'reset':
				await message.channel.sendMessage(`Are you sure you want to reset config? (__y__es | __n__o)`);
				const confirmation: Message = (await message.channel.awaitMessages((a: Message) =>
					a.author.id === message.author.id, { max: 1, time: 20000 })).first();

				if (!confirmation) return message.channel.sendMessage('Command timed out, aborting config reset.');

				if (!/^(?:yes|y)$/.test(confirmation.content))
					return message.channel.sendMessage('Okay, aborting config reset.');

				const storage: GuildStorage = message.guild.storage;
				for (const setting of ['modrole', 'mutedrole', 'modlogs', 'appeals'])
					storage.removeSetting(setting);

				return message.channel.sendMessage(
					`Server config reset. You'll need to reconfigure to be able to use mod commands again.`);
		}
	}
}
