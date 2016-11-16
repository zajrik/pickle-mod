'use strict';
import { Bot, Command } from 'yamdbf';
import { User, Message, Collection, GuildChannel, TextChannel } from 'discord.js';

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
			permissions: ['MANAGE_GUILD'],
			roles: ['Mod'],
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		const channelName: string = (<GuildChannel> message.channel).name;
		if ( channelName === 'mod-logs' || channelName === 'ban-appeals') return message.delete()
			.then(<any> message.channel.sendMessage('You may not use that command in this channel.')
				.then((res: Message) => res.delete(5000)));

		const ask: Message = <Message> await message.channel.sendMessage(
			`Are you sure you want to reset the mod logs in this guild? (__y__es | __n__o)`);
		const confirmation: Message = (await message.channel.awaitMessages((a: Message) =>
			a.author.id === message.author.id, { max: 1, time: 10000 })).first();

		if (!confirmation) return message.channel.sendMessage('Command timed out, aborting mod-logs reset.')
			.then((res: Message) => res.delete(5000)).then(() => [message, ask]
				.forEach((a: Message) => a.delete()));

		if (!/^(?:yes|y)$/.test(confirmation.content))
			return message.channel.sendMessage('Okay, aborting mod-logs reset.')
				.then((res: Message) => res.delete(5000)).then(() => [message, ask, confirmation]
					.forEach((a: Message) => a.delete()));

		message.channel.sendMessage('Okay, clearing mod logs.')
			.then((res: Message) => res.delete(5000));
		[message, ask, confirmation].forEach((a: Message) => a.delete());

		this.bot.guildStorages.get(message.guild).setSetting('cases', 0);

		const logsChannel: TextChannel = <TextChannel> this.bot.guilds.get(message.guild.id).channels.find('name', 'mod-logs');
		const purgeMessage: Message = <Message> await logsChannel.sendMessage('Mod log reset in progress...');
		let purging: boolean = true;
		while (purging)
		{
			let messages: Collection<string, Message>;
			messages = (await logsChannel.fetchMessages({ limit: 100 }));
			purging = !(messages.size === 1 && messages.first().content === 'Mod log reset in progress...')
				|| messages.size === 0;
			const toDelete: string[] = messages.keyArray().slice(1);
			for (let key of toDelete) { await messages.get(key).delete(); }
		}

		return purgeMessage.delete()
			.then(() => logsChannel.sendMessage('Mod log reset completed.'))
			.then((res: Message) => res.delete(3000))
			.then(() => message.channel.sendMessage('Mod log reset completed.'))
			.then((res: Message) => res.delete(3000));
	}
}
