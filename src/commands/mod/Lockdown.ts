import { Command, LocalStorage, Message } from 'yamdbf';
import { User, TextChannel } from 'discord.js';
import ModBot from '../../lib/ModBot';
import Time from '../../lib/Time';

export default class Lockdown extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'lockdown',
			aliases: [],
			description: 'Lock down a channel for a set time',
			usage: '<prefix>lockdown <duration|clear>',
			extraHelp: 'Uses duration shorthand to determine duration. Examples:\n\n\t30s\n\t10m\n\t5h\n\t1d\n\nUse `lockdown clear` to remove the channel lockdown',
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return;
		if (args[0] !== 'clear')
		{
			const duration: number = Time.parseShorthand(<string> args[0]);
			if (!duration) return message.channel.send(
				'You must provide a lockdown duration. Use the help command for more information');

			try
			{
				const storage: LocalStorage = this.bot.storage;
				const notify: Message = <Message> await message.channel
					.send(`***This channel is locked down. (${Time.difference(duration * 2, duration).toString()})***`);
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
					return message.channel.send('This channel is not locked down.');
				const oldPayload: any = activeLockdowns[message.channel.id];
				const payload: any = {
					id: message.guild.roles.find('name', '@everyone').id,
					type: 'role',
					allow: oldPayload.allow,
					deny: oldPayload.deny
				};
				await (<any> this.bot).rest.methods.setChannelOverwrite(message.channel, payload);
				delete activeLockdowns[message.channel.id];
				storage.setItem(key, activeLockdowns);
				message.channel.send('**The lockdown on this channel has ended.**');
			});
		}
	}
}
