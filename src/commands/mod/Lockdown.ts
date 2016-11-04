'use strict';
import { Bot, Command, LocalStorage } from 'yamdbf';
import { User, Message, TextChannel } from 'discord.js';
import ModBot from '../../lib/ModBot';
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
			let duration: number, match: RegExpMatchArray ;
			if (/^\d+[m|h|d]$/.test(<string> args[0]))
			{
				match = (<string> args.shift()).match(/(\d+)(m|h|d)$/);
				duration = parseFloat(match[1]);
				duration = match[2] === 'm'
					? duration * 1000 * 60 : match[2] === 'h'
					? duration * 1000 * 60 * 60 : match[2] === 'd'
					? duration * 1000 * 60 * 60 * 24 : null;
			}
			if (!duration) return message.channel.sendMessage(
				'You must provide a lockdown duration. Use the help command for more information');

			try
			{
				const storage: LocalStorage = this.bot.storage;
				const notify: Message = <Message> await message.channel
					.sendMessage(`***This channel is locked down***`);
				await storage.nonConcurrentAccess('activeLockdowns', (key: string) =>
				{
					const activeLockdowns: ActiveLockdowns = storage.getItem(key) || {};
					const channel: string = notify.channel.id;
					if (!activeLockdowns[channel]) activeLockdowns[channel] = {
						message: notify.id,
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
			await storage.nonConcurrentAccess('activeLockdowns', (key: string) =>
			{
				let activeLockdowns: ActiveLockdowns = storage.getItem(key) || {};
				if (!activeLockdowns[message.channel.id])
					return message.channel.sendMessage('This channel is not locked down.')
						.then((res: Message) => res.delete(5000));
				delete activeLockdowns[message.channel.id];
				storage.setItem(key, activeLockdowns);
				(<TextChannel> message.channel).overwritePermissions(
					message.guild.roles.find('name', '@everyone'), <any> {});
			});
		}
	}
};
