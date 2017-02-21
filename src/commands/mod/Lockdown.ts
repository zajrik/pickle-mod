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
			extraHelp: 'Uses duration shorthand to determine duration. Examples:\n\n\t30s\n\t10m\n\t5h\n\t1d\n\nUse `lockdown clear` to remove the channel lockdown.\n\nCalling the lockdown command when a channel is already locked down will restart the lockdown with the new duration.',
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.hasModRole(message.member))
			return message.channel.send(`You must have the \`${message.guild.roles.get(
				message.guild.storage.getSetting('modrole')).name}\` role to use Mod commands.`);

		if (!(await message.guild.fetchMember(this.bot.user)).hasPermission('MANAGE_CHANNELS'))
			return message.channel.send(`I need to have \`Manage Channels\` permissions to do that on this server.`);

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

			const durationString: string = Time.duration(duration).toString();

			try
			{
				const storage: LocalStorage = this.bot.storage;
				const notify: Message = <Message> await channel.send(
					`***This channel is locked down. (${durationString})***`);
				const oldPayload: any = channel.permissionOverwrites
					.get(message.guild.id) || { allow: 0, deny: 0 };
				await storage.queue('activeLockdowns', (key: string) =>
				{
					const activeLockdowns: ActiveLockdowns = storage.getItem(key) || {};
					const channelID: string = notify.channel.id;
					activeLockdowns[channelID] = {
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
					message.guild.roles.get(message.guild.id), <any> { SEND_MESSAGES: false });

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
			const checkLockdowns: ActiveLockdowns = storage.getItem('activeLockdowns') || {};
			const lockdown: LockdownObject = checkLockdowns[channel.id];
			if (!lockdown) return message.channel.send('The channel is not locked down.');

			if ((lockdown.duration - (Time.now() - lockdown.timestamp)) < 10e3)
				return message.channel.send(
					'The lockdown on the channel is about to expire. Just wait it out.');

			await storage.queue('activeLockdowns', async (key: string) =>
			{
				let activeLockdowns: ActiveLockdowns = storage.getItem(key) || {};
				const oldPayload: any = activeLockdowns[channel.id];
				const payload: any = {
					id: message.guild.roles.get(message.guild.id).id,
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
