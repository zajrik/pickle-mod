import { Command, Message } from 'yamdbf';
import { User, TextChannel } from 'discord.js';
import ModBot from '../../lib/ModBot';

export default class ClearLogs extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'clearlogs',
			aliases: [],
			description: 'Clear the moderation logs channel, resetting cases to 0',
			usage: '<prefix>clearlogs',
			extraHelp: '',
			group: 'mod',
			permissions: ['MANAGE_GUILD']
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return;
		if (!(await message.guild.fetchMember(this.bot.user)).hasPermission('MANAGE_CHANNELS'))
			return message.channel.send(`I don't have permission to do that on this server.`);

		const channelName: string = (<TextChannel> message.channel).name;
		if (channelName === message.guild.channels.get(message.guild.storage.getSetting('modlogs')).name)
			return message.channel.send('You may not use that command in this channel.')
				.then((res: Message) => message.delete().then(() => res.delete()));

		await message.channel.send(
			`Are you sure you want to reset the mod logs in this guild? (__y__es | __n__o)`);
		const confirmation: Message = (await message.channel.awaitMessages((a: Message) =>
			a.author.id === message.author.id, { max: 1, time: 20e3 })).first();

		if (!confirmation) return message.channel.send('Command timed out, aborting mod logs reset.');

		if (!/^(?:yes|y)$/.test(confirmation.content))
			return message.channel.send('Okay, aborting mod logs reset.');

		message.channel.send('Okay, resetting mod logs.');
		const channel: TextChannel = <TextChannel> message.guild.channels.get(message.guild.storage.getSetting('modlogs'));
		try
		{
			const newChannel: TextChannel = <TextChannel> await channel.clone(channel.name, true);
			message.guild.storage.setSetting('modlogs', newChannel.id);
			message.guild.storage.setSetting('cases', 0);

			await channel.delete();
			await newChannel.setPosition(channel.position);
			return message.channel.send('Mod logs successfully reset.');
		}
		catch (err)
		{
			return message.channel.send('There was an error while resetting mod logs.');
		}
	}
}
