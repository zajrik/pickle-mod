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
			usage: '<prefix>lockdown [#channel] <duration|clear>',
			extraHelp: 'Uses duration shorthand to determine duration. Examples:\n\n\t30s\n\t10m\n\t5h\n\t1d\n\nUse `lockdown clear` to remove the channel lockdown',
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return;

		let channel: TextChannel;
		const parseChannel: RegExp = /<#(\d+)>/;
		const channelIndex: int = args.findIndex(a => parseChannel.test(<string> a));

		if (channelIndex > -1) channel = <TextChannel> this.bot.channels.get(
			(<string> args.splice(channelIndex, 1)[0]).match(parseChannel)[1]);
		else channel = <TextChannel> message.channel;

		if (channel.guild.id !== message.guild.id)
			return message.channel.send('You may not lock down channels in other guilds.');

		if (args[0] !== 'clear')
		{
			const duration: number = Time.parseShorthand(<string> args[0]);
			if (!duration) return message.channel.send(
				'You must provide a lockdown duration. Use the help command for more information');

			const durationString: string = Time.difference(duration * 2, duration).toString();

			try
			{
				const storage: LocalStorage = this.bot.storage;
				const notify: Message = <Message> await channel.send(
					`***This channel is locked down. (${durationString})***`);
				const oldPayload: any = channel.permissionOverwrites
					.get(message.guild.roles.find('name', '@everyone').id)
					|| { allow: 0, deny: 0 };
				await storage.queue('activeLockdowns', (key: string) =>
				{
					const activeLockdowns: ActiveLockdowns = storage.getItem(key) || {};
					const channelID: string = notify.channel.id;
					if (!activeLockdowns[channelID]) activeLockdowns[channelID] = {
						message: notify.id,
						channel: channel.id,
						allow: oldPayload.allow,
						deny: oldPayload.deny,
						duration: duration,
						timestamp: message.createdTimestamp
					};
					storage.setItem(key, activeLockdowns);
					console.log(`Locked down channel '${channel.name}' in guild '${message.guild.name}'`);
				});
				channel.overwritePermissions(
					message.guild.roles.find('name', '@everyone'), <any> { SEND_MESSAGES: false });

				if (message.channel.id !== channel.id)
					message.channel.send(`***Locked down ${channel}. (${durationString})***`);
			}
			catch (err)
			{
				console.log(err.stack);
			}
		}
		else
		{
			const storage: LocalStorage = this.bot.storage;
			await storage.queue('activeLockdowns', async (key: string) =>
			{
				let activeLockdowns: ActiveLockdowns = storage.getItem(key) || {};
				if (!activeLockdowns[channel.id])
					return message.channel.send('The channel is not locked down.');
				const oldPayload: any = activeLockdowns[channel.id];
				const payload: any = {
					id: message.guild.roles.find('name', '@everyone').id,
					type: 'role',
					allow: oldPayload.allow,
					deny: oldPayload.deny
				};
				await (<any> this.bot).rest.methods.setChannelOverwrite(channel, payload);
				delete activeLockdowns[channel.id];
				storage.setItem(key, activeLockdowns);
				channel.send('**The lockdown on this channel has ended.**');
			});
		}
	}
}
