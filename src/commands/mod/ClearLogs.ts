'use strict';
import { Bot, Command, Message, GuildStorage } from 'yamdbf';
import { User, Collection, TextChannel } from 'discord.js';
import ModBot from '../../lib/ModBot';

export default class ClearLogs extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'clearlogs',
			aliases: [],
			description: 'Clear mod-logs, resetting cases to 0',
			usage: '<prefix>clearlogs',
			extraHelp: '',
			group: 'mod',
			permissions: ['MANAGE_GUILD']
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!(<ModBot> this.bot).mod.canCallModCommand(message)) return;
		const channelName: string = (<TextChannel> message.channel).name;
		if (channelName === message.guild.channels.get(message.guild.storage.getSetting('modlogs')).name)
			return message.channel.sendMessage('You may not use that command in this channel.');

		await message.channel.sendMessage(
			`Are you sure you want to reset the mod logs in this guild? (__y__es | __n__o)`);
		const confirmation: Message = (await message.channel.awaitMessages((a: Message) =>
			a.author.id === message.author.id, { max: 1, time: 10000 })).first();

		if (!confirmation) return message.channel.sendMessage('Command timed out, aborting mod-logs reset.');

		if (!/^(?:yes|y)$/.test(confirmation.content))
			return message.channel.sendMessage('Okay, aborting mod-logs reset.');

		message.channel.sendMessage('Okay, clearing mod logs.');
		let storage: GuildStorage = message.guild.storage;
		storage.setSetting('cases', 0);

		const logsChannelId: string = storage.getSetting('modlogs');
		const logsChannel: TextChannel = <TextChannel> message.guild.channels.get(logsChannelId);
		const purgeMessage: Message = <Message> await logsChannel.sendMessage('Mod log reset in progress...');
		while (true)
		{
			let messages: Collection<string, Message>;
			messages = (await logsChannel.fetchMessages({ limit: 100, before: purgeMessage.id }));
			if (messages.size === 0) break;
			await logsChannel.bulkDelete(messages);
		}

		return purgeMessage.delete()
			.then(() => message.channel.sendMessage('Mod log reset completed.'));
	}
}
