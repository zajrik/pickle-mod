import { Command, LocalStorage, Message } from 'yamdbf';
import { User, GuildMember } from 'discord.js';
import ModBot from '../../../lib/ModBot';
import { parseArgs } from '../../../lib/Util';

export default class Unmute extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'unmute',
			description: 'Unmute a user',
			usage: '<prefix>unmute <@user>',
			extraHelp: '',
			argOpts: { stringArgs: true },
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, [], mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return;
		if (!this.bot.mod.hasSetMutedRole(message.guild)) return message.channel.send(
			`This server doesn't have a role set for muting.`);

		const args: string[] = parseArgs(original);
		const idRegex: RegExp = /^(?:<@!?)?(\d+)>?$/;
		if (!idRegex.test(args[0])) return message.channel.send(
			'You must mention a user or provide an ID to unmute.');
		const id: string = args.shift().match(idRegex)[1];

		let user: User;
		try { user = await this.bot.fetchUser(id); }
		catch (err) { return message.channel.send('Failed to fetch a user with that ID.'); }

		let member: GuildMember;
		try { member = await message.guild.fetchMember(user); }
		catch (err) { return message.channel.send('Failed to fetch a member with that ID.'); }

		const mutedRole: string = message.guild.storage.getSetting('mutedrole');
		if (!member.roles.has(mutedRole)) return message.channel.send(`That user is not muted`);

		const unmuting: Message = <Message> await message.channel.send(
			`Unmuting ${user.username}#${user.discriminator}...`);

		try
		{
			const storage: LocalStorage = this.bot.storage;
			await this.bot.mod.actions.unmute(member, message.guild);
			await storage.queue('activeMutes', (key: string) =>
			{
				let activeMutes: ActiveMutes = storage.getItem(key) || {};
				activeMutes[user.id] = activeMutes[user.id].filter((a: MuteObject) => a.guild !== message.guild.id);
				storage.setItem(key, activeMutes);
				console.log(`Unmuted user '${user.username}#${user.discriminator}'`);
			});
			user.send(`You have been unmuted on ${message.guild.name}. You may now send messages.`);
			return unmuting.edit(`Unmuted ${user.username}#${user.discriminator}`);
		}
		catch (err)
		{
			return message.channel.send(`There was an error while unmuting the user:\n${err}`);
		}
	}
}
