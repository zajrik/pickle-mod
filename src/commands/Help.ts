'use strict';
import { Bot, Command, Message, GuildStorage } from 'yamdbf';
import { User, Collection, RichEmbed } from 'discord.js';

type int = number;

export default class Help extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'help',
			description: 'Provides information on bot commands',
			aliases: [],
			usage: `<prefix>help [command]`,
			extraHelp: 'Will DM bot command help information to the user to keep clutter down in guild channels. If you use the help command from within a DM you will only receive information for the commands you can use within the DM. If you want help with commands usable in a guild, call the help command in a guild channel. You will receive a list of the commands that you have permissions/roles for in that channel.',
			group: 'base',
			overloads: 'help'
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		const dm: boolean = message.channel.type === 'dm' || message.channel.type === 'group';
		const mentionName: string = `@${this.bot.user.username}#${this.bot.user.discriminator}`;
		const prefix: string = !dm ? message.guild.storage.getSetting('prefix') : '';

		let usableCommands: Collection<string, Command> =
			new Collection<string, Command>(this.bot.commands.entries());
		let command: Command;
		let output: string = '';
		let embed: RichEmbed = new RichEmbed();

		if (!args[0])
		{
			embed.setAuthor('Moderation commands', this.bot.user.avatarURL)
				.addField(`${prefix}warn <@user> <...reason>`, 'Give a formal warning to a user')
				.addField(`${prefix}mute <@user> <duration> <...reason>`,
					`Mute a user for a specified duration.\n`
					+ 'Duration format examples: `30m`, `2h`, `1d`', true)
				.addField(`${prefix}unmute <@user>`, `Unmute a user`, true)
				.addField(`${prefix}kick <@user> <...reason>`, `Kick a user from the server`)
				.addField(`${prefix}softban <@user>`, `Kick a user from the server, removing 7 days of their messages`)
				.addField(`${prefix}ban <@user>`, `Ban a user from the server.`, true)
				.addField(`${prefix}unban <id>`, `Unban a user by ID.`, true)
				.addField('\u200b', '\u200b', true)
				.addField(`${prefix}reason <case#|latest> <...reason>`, `Set the reason for a moderation case`)
				.addField(`${prefix}lockdown <duration>`,
					`Lock down the channel the command is called in for a specified duration.\n`
					+ 'Duration format examples: `30m`, `2h`, `1d`');

			for (const cmd of ['warn', 'mute', 'unmute', 'kick', 'softban',
				'ban', 'unban', 'reason', 'lockdown', 'eval', '$', 'appeal'])
				usableCommands.delete(cmd);

			if (message.guild)
			{
				const storage: GuildStorage = message.guild.storage;
				for (const [name, cmd] of usableCommands.entries())
					if (storage.settingExists('disabledGroups')
						&& storage.getSetting('disabledGroups').includes(cmd.group))
						usableCommands.delete(name);
			}

			embed.addField('Other commands', usableCommands.map((c: Command) => c.name).join(', '))
				.addField('\u200b', `Use \`help <command>\` ${this.bot.selfbot ? '' : `or \`${
				mentionName} help <command>\` `}for more information.\n\n`);
		}
		else
		{
			const filter: Function = (c: Command) =>
				c.name === args[0] || c.aliases.includes(<string> args[0]);
			if (!dm) command = this.bot.commands
				.filterGuildUsable(this.bot, message).filter(filter).first();
			else command = this.bot.commands
				.filterDMHelp(this.bot, message).filter(filter).first();

			if (!command) output = `A command by that name could not be found or you do\n`
				+ `not have permissions to view it in this guild or channel`;
			else output = '```ldif\n'
				+ `Command: ${command.name}\n`
				+ `Description: ${command.description}\n`
				+ (command.aliases.length > 0 ? `Aliases: ${command.aliases.join(', ')}\n` : '')
				+ `Usage: ${command.usage}\n`
				+ (command.extraHelp ? `\n${command.extraHelp}` : '')
				+ '\n```';
		}

		output = dm ? output.replace(/<prefix>/g, '')
			: output.replace(/<prefix>/g, this.bot.getPrefix(message.guild) || '');

		embed.setColor(11854048);
		if (output) embed.setDescription(output);

		let outMessage: Message;
		if (!dm && !this.bot.selfbot && command) message.reply(`Sent you a DM with help information.`);
		if (!dm && !this.bot.selfbot && !command) message.reply(`Sent you a DM with information.`);
		if (this.bot.selfbot) outMessage = <Message> await message.channel.sendEmbed(embed);
		else message.author.sendEmbed(embed);

		if (this.bot.selfbot) outMessage.delete(30e3);
	}

	private _padRight(text: string, width: int): string
	{
		let pad: int = Math.max(0, Math.min(width, width - text.length));
		return `${text}${' '.repeat(pad)}`;
	}
}
