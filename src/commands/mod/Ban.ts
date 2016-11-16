'use strict';
import { Bot, Command, LocalStorage } from 'yamdbf';
import { User, Message } from 'discord.js';
import { ActiveBans } from '../../lib/ModActions';
import ModBot from '../../lib/ModBot';

export default class Ban extends Command
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: 'ban',
			aliases: [],
			description: 'Ban a user',
			usage: '<prefix>ban <@user> <reason>',
			extraHelp: '',
			group: 'mod',
			roles: ['Mod']
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		message.delete();
		if (!mentions[0]) return message.channel.sendMessage('You must mention a user to ban.');
		const user: User = mentions[0];

		if (user.id === message.author.id)
			return message.channel.sendMessage(`I don't think you want to ban yourself.`)
				.then((res: Message) => res.delete(5000));

		if (message.guild.members.get(user.id).roles.find('name', 'Mod') || user.id === message.guild.ownerID || user.bot)
			return message.channel.sendMessage('You may not use this command on that user.')
				.then((res: Message) => res.delete(5000));

		const reason: string = args.join(' ').trim();
		if (!reason) return message.channel.sendMessage('You must provide a reason to ban that user.')
			.then((res: Message) => res.delete(5000));

		const embed: any = {
			color: 16718080,
			author: {
				name: `${user.username}#${user.discriminator}`,
				icon_url: user.avatarURL
			},
			description: reason,
			footer: {
				text: (<ModBot> this.bot).mod.checkUserHistory(message.guild, user)
			}
		};

		const ask: Message = <Message> await message.channel.sendMessage(
			`Are you sure you want issue this ban? (__y__es | __n__o)`,	<any> { embed: embed });
		const confirmation: Message = (await message.channel.awaitMessages((a: Message) =>
			a.author.id === message.author.id, { max: 1, time: 20000 })).first();

		if (!confirmation) return message.channel.sendMessage('Command timed out, aborting ban.')
			.then((res: Message) => res.delete(5000))
			.then(() => ask.delete());

		if (!/^(?:yes|y)$/.test(confirmation.content))
			return message.channel.sendMessage('Okay, aborting ban.')
				.then((res: Message) => res.delete(5000))
				.then(() => [ask, confirmation].forEach((a: Message) => a.delete()));

		await (<ModBot> this.bot).mod.ban(user, message.guild);
		await (<ModBot> this.bot).mod.caseLog(user, message.guild, 'Ban', reason, message.author);

		const storage: LocalStorage = this.bot.storage;
		await storage.nonConcurrentAccess('activeBans', (key: string) =>
		{
			const activeBans: ActiveBans = storage.getItem(key) || {};
			if (!activeBans[user.id]) activeBans[user.id] = [];
			activeBans[user.id].push({
				user: user.id,
				raw: `${user.username}#${user.discriminator}`,
				guild: message.guild.id,
				guildName: message.guild.name,
				reason: reason,
				timestamp: message.createdTimestamp
			});
			storage.setItem(key, activeBans);
		});

		console.log(`Banned ${user.username}#${user.discriminator} from guild '${message.guild.name}'`);
		user.sendMessage(`You have been banned from ${message.guild.name}.\n\`Reason:\` ${reason}\n\nYou can appeal your ban by DMing me the command \`appeal <message>\`, where \`'<message>'\` is a message detailing why you think you deserve to have your ban lifted. You must send this command without a prefix or I won't recognize it. If you are currently banned from more than one server that I serve, you may only appeal the most recent ban until that appeal is approved or rejected.\n\nAfter you have sent your appeal it will be passed to the server moderators for review. You will be notified when your appeal has been approved or rejected. If your appeal is rejected, you may not appeal again.\n\nIf you are unable to DM me because we do not have any mutual servers, you may use this invite to gain a mutual server and then DM me your appeal.\nhttps://discord.gg/TEXjY6e`);
		message.channel.sendMessage(`Successfully banned ${user.username}#${user.discriminator}`)
			.then((res: Message) => res.delete(5000))
			.then(() => confirmation.delete())
			.then(() => ask.delete());
	}
}
