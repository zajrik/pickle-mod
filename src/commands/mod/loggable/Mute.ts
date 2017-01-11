import { Command, LocalStorage, Message } from 'yamdbf';
import { User } from 'discord.js';
import ModBot from '../../../lib/ModBot';
import Time from '../../../lib/Time';

export default class Mute extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'mute',
			aliases: [],
			description: 'Mute a user',
			usage: '<prefix>mute <@user> <duration> <reason>',
			extraHelp: 'Uses duration shorthand to determine duration. Examples:\n\n\t30s\n\t10m\n\t5h\n\t1d',
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return;
		if (!this.bot.mod.hasSetMutedRole(message.guild)) return;
		if (!mentions[0]) return message.channel.send('You must mention a user to mute.');
		const user: User = mentions[0];

		if (user.id === message.author.id)
			return message.channel.send(`I don't think you want to mute yourself.`);

		const modRole: string = message.guild.storage.getSetting('modrole');
		if (message.guild.member(user.id).roles.has(modRole) || user.id === message.guild.ownerID || user.bot)
			return message.channel.send('You may not use this command on that user.');

		const durationString: string = <string> args[0];
		const duration: number = Time.parseShorthand(durationString);
		if (!duration) return message.channel.send('You must provide a duration. (example: `30m`, `1h`, `2d`)');

		const reason: string = (duration ? args.slice(1) : args).join(' ').trim();
		if (!reason) return message.channel.send('You must provide a reason to mute that user.');

		const mutedRole: string = message.guild.storage.getSetting('mutedrole');
		if (message.guild.member(user.id).roles.has(mutedRole))
			return message.channel.send(`That user is already muted`);

		try
		{
			const storage: LocalStorage = this.bot.storage;
			await this.bot.mod.actions.mute(user, message.guild);
			await this.bot.mod.logger.caseLog(user, message.guild, 'Mute', reason, message.author, durationString);
			await storage.nonConcurrentAccess('activeMutes', (key: string) =>
			{
				let activeMutes: ActiveMutes = storage.getItem(key) || {};
				if (!activeMutes[user.id]) activeMutes[user.id] = [];
				activeMutes[user.id].push({
					raw: `${user.username}#${user.discriminator}`,
					user: user.id,
					guild: message.guild.id,
					duration: duration,
					timestamp: message.createdTimestamp
				});
				storage.setItem(key, activeMutes);
				console.log(`Muted user '${user.username}#${user.discriminator}'`);
				user.send(`You've been muted in ${message.guild.name}`);
			});
			return message.channel.send(`Muted ${user.username}#${user.discriminator}`);
		}
		catch (err)
		{
			console.log(err.stack);
		}
	}
}
