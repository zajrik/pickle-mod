import { Collection, RichEmbed } from 'discord.js';
import { Client, Command, GuildStorage, Message } from 'yamdbf';

export default class extends Command<Client>
{
	public constructor(client: Client)
	{
		super(client, {
			name: 'help',
			description: 'Provides information on bot commands',
			aliases: [],
			usage: `<prefix>help [command]`,
			extraHelp: 'Will DM bot command help information to the user to keep clutter down in guild channels. If you use the help command from within a DM you will only receive information for the commands you can use within the DM. If you want help with commands usable in a guild, call the help command in a guild channel. You will receive a list of the commands that you have permissions/roles for in that channel.',
			group: 'base',
			overloads: 'help'
		});
	}

	public async action(message: Message, args: string[]): Promise<any>
	{
		const dm: boolean = message.channel.type === 'dm' || message.channel.type === 'group';
		const mentionName: string = `@${this.client.user.username}#${this.client.user.discriminator}`;
		const prefix: string = !dm ? await message.guild.storage.settings.get('prefix') : '';

		let usableCommands: Collection<string, Command<any>> =
			new Collection<string, Command<any>>(this.client.commands.entries());
		let command: Command<any>;
		let output: string = '';
		let embed: RichEmbed = new RichEmbed();

		if (!args[0])
		{
			embed.setAuthor('Moderation commands', this.client.user.avatarURL)
				.addField(`${prefix}warn <member> <...reason>`, 'Give a formal warning to a user')
				.addField(`${prefix}mute <member> <duration> <...reason>`,
					`Mute a user for a specified duration\n`
					+ 'Duration format examples: `30m`, `2h`, `1d`', true)
				.addField(`${prefix}unmute <member>`, `Unmute a user`, true)
				.addField(`${prefix}kick <member> <...reason>`, `Kick a user from the server`)
				.addField(`${prefix}softban <user> <...reason>`, `Kick a user from the server, removing 7 days of their messages`)
				.addField(`${prefix}ban <user> <...reason>`, `Ban a user from the server`, true)
				.addField(`${prefix}unban <user> <...reason>`, `Unban a banned user`, true)
				.addField(`${prefix}reason <#|#-#|latest> <...reason>`, `Set the reason for a moderation case`)
				.addField(`${prefix}lockdown <duration> [#channel]`,
					`Lock down the channel the command is called in, or the provided channel for a specified duration\n`
					+ 'Duration format examples: `30m`, `2h`, `1d`');

			for (const cmd of ['warn', 'mute', 'unmute', 'kick', 'softban',
				'ban', 'unban', 'reason', 'lockdown', 'eval', '$', 'appeal'])
				usableCommands.delete(cmd);

			if (message.guild)
			{
				const storage: GuildStorage = message.guild.storage;
				for (const [name, cmd] of usableCommands.entries())
					if (await storage.settings.exists('disabledGroups')
						&& (await storage.settings.get('disabledGroups') || []).includes(cmd.group))
						usableCommands.delete(name);
			}

			embed.addField('Other commands', usableCommands.map((c: Command<any>) => c.name).join(', '))
				.addField('\u200b', `Use \`help <command>\` ${this.client.selfbot ? '' : `or \`${
					mentionName} help <command>\` `}for more information.\n\n`);
		}
		else
		{
			const filter: any = (c: Command<any>) =>
				c.name === args[0] || c.aliases.includes(<string> args[0]);
			if (!dm) command = (await this.client.commands
				.filterGuildUsable(this.client, message)).filter(filter).first();
			else command = this.client.commands
				.filterDMHelp(this.client, message).filter(filter).first();

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
			: output.replace(/<prefix>/g, await this.client.getPrefix(message.guild) || '');

		embed.setColor(11854048);
		if (output) embed.setDescription(output);

		if (!dm && command) message.reply(`Sent you a DM with help information.`);
		if (!dm && !command) message.reply(`Sent you a DM with information.`);
		message.author.sendEmbed(embed);
	}

	private _padRight(text: string, width: int): string
	{
		let pad: int = Math.max(0, Math.min(width, width - text.length));
		return `${text}${' '.repeat(pad)}`;
	}
}
