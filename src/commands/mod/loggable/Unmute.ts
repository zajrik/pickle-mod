import { Command, LocalStorage, Message } from 'yamdbf';
import { User, GuildMember } from 'discord.js';
import ModBot from '../../../lib/ModBot';

export default class Unmute extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'unmute',
			aliases: [],
			description: 'Unmute a user',
			usage: '<prefix>unmute <@user>',
			extraHelp: '',
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

		const mutedRole: string = message.guild.storage.getSetting('mutedrole');
		const member: GuildMember = await message.guild.fetchMember(user);
		if (!member.roles.has(mutedRole)) return message.channel.send(`That user is not muted`);

		try
		{
			const storage: LocalStorage = this.bot.storage;
			await this.bot.mod.actions.unmute(user, message.guild);
			await storage.queue('activeMutes', (key: string) =>
			{
				let activeMutes: ActiveMutes = storage.getItem(key) || {};
				activeMutes[user.id] = activeMutes[user.id].filter((a: MuteObject) => a.guild !== message.guild.id);
				storage.setItem(key, activeMutes);
				console.log(`Unmuted user '${user.username}#${user.discriminator}'`);
			});
			user.send(`You have been unmuted on ${message.guild.name}. You may now send messages.`);
			return message.channel.send(`Unmuted ${user.username}#${user.discriminator}`);
		}
		catch (err)
		{
			console.log(err.stack);
		}
	}
}
