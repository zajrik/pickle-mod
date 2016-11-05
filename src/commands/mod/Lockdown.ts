'use strict';
import { Bot, Command, LocalStorage } from 'yamdbf';
import { User, Message, TextChannel } from 'discord.js';
import Time from '../../lib/Time';
import { ActiveLockdowns } from '../../lib/ModActions';

export default class Lockdown extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'lockdown',
			aliases: [],
			description: 'Lock down a channel for a set time',
			usage: '<prefix>lockdown <duration|clear>',
			extraHelp: 'Use `lockdown clear` to remove the channel lockdown',
			group: 'mod',
			roles: ['Mod']
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		message.delete();
		if ((<TextChannel> message.channel).name === 'mod-logs'
			|| (<TextChannel> message.channel).name === 'ban-appeals') return;
		if (args[0] !== 'clear')
		{
			const duration: number = Time.parseShorthand(<string> args[0]);
			if (!duration) return message.channel.sendMessage(
				'You must provide a lockdown duration. Use the help command for more information');

			try
			{
				const storage: LocalStorage = this.bot.storage;
				const notify: Message = <Message> await message.channel
					.sendMessage(`***This channel is locked down. (${Time.difference(duration * 2, duration).toString()})***`);
				const oldPayload: any = (<TextChannel> message.channel)
					.permissionOverwrites.get(message.guild.roles.find('name', '@everyone').id)
					|| { allowData: 0, denyData: 0 };
				await storage.nonConcurrentAccess('activeLockdowns', (key: string) =>
				{
					const activeLockdowns: ActiveLockdowns = storage.getItem(key) || {};
					const channel: string = notify.channel.id;
					if (!activeLockdowns[channel]) activeLockdowns[channel] = {
						message: notify.id,
						channel: message.channel.id,
						allow: oldPayload.allowData,
						deny: oldPayload.denyData,
						duration: duration,
						timestamp: message.createdTimestamp
					};
					storage.setItem(key, activeLockdowns);
					console.log(`Locked down channel '${(<TextChannel> message.channel).name}' in guild '${message.guild.name}'`);
				});
				(<TextChannel> message.channel).overwritePermissions(
					message.guild.roles.find('name', '@everyone'), <any> { SEND_MESSAGES: false });
			}
			catch (err)
			{
				console.log(err.stack);
			}
		}
		else
		{
			const storage: LocalStorage = this.bot.storage;
			await storage.nonConcurrentAccess('activeLockdowns', async (key: string) =>
			{
				let activeLockdowns: ActiveLockdowns = storage.getItem(key) || {};
				if (!activeLockdowns[message.channel.id])
					return message.channel.sendMessage('This channel is not locked down.')
						.then((res: Message) => res.delete(5000));
				const oldPayload: any = activeLockdowns[message.channel.id];
				const payload: any = {
					id: message.guild.roles.find('name', '@everyone').id,
					type: 'role',
					allow: oldPayload.allow,
					deny: oldPayload.deny
				};
				await this.bot.rest.methods.setChannelOverwrite(message.channel, payload);
				delete activeLockdowns[message.channel.id];
				storage.setItem(key, activeLockdowns);
				message.channel.fetchMessage(oldPayload.message)
					.then((msg: Message) => msg.delete());
				message.channel.sendMessage('The lockdown on this channel has ended.')
					.then((res: Message) => res.delete(10000));
			});
		}
	}
}
