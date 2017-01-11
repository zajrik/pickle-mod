import { Command, Message } from 'yamdbf';
import { User, RichEmbed } from 'discord.js';
import ModBot from '../../../lib/ModBot';

export default class Ban extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'ban',
			aliases: [],
			description: 'Ban a user',
			usage: '<prefix>ban <@user> <...reason>',
			extraHelp: '',
			group: 'mod'
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		if (!this.bot.mod.canCallModCommand(message)) return;
		if (!mentions[0]) return message.channel.send('You must mention a user to ban.');
		const user: User = mentions[0];

		if (user.id === message.author.id)
			return message.channel.send(`I don't think you want to ban yourself.`);

		const modRole: string = message.guild.storage.getSetting('modrole');
		if (message.guild.member(user.id).roles.has(modRole) || user.id === message.guild.ownerID || user.bot)
			return message.channel.send('You may not use this command on that user.');

		const reason: string = args.join(' ').trim();
		if (!reason) return message.channel.send('You must provide a reason to ban that user.');

		const offenses: any = this.bot.mod.actions.checkUserHistory(message.guild, user);
		const embed: RichEmbed = new RichEmbed()
			.setColor(offenses.color)
			.setDescription(`**Reason:** ${reason}`)
			.setAuthor(`${user.username}#${user.discriminator}`, user.avatarURL)
			.setFooter(offenses.toString());

		await message.channel.send(
			`Are you sure you want issue this ban? (__y__es | __n__o)`,	Object.assign({}, { embed }));
		const confirmation: Message = (await message.channel.awaitMessages((a: Message) =>
			a.author.id === message.author.id, { max: 1, time: 20000 })).first();

		if (!confirmation) return message.channel.send('Command timed out, aborting ban.');

		if (!/^(?:yes|y)$/.test(confirmation.content))
			return message.channel.send('Okay, aborting ban.');

		await user.send(`You have been banned from ${message.guild.name}.\n**Reason:** ${reason}\n\nYou can appeal your ban by DMing me the command \`appeal <message>\`, where \`'<message>'\` is a message detailing why you think you deserve to have your ban lifted. You must send this command without a prefix or I won't recognize it. If you are currently banned from more than one server that I serve, you may only appeal the most recent ban until that appeal is approved or rejected.\n\nAfter you have sent your appeal it will be passed to the server moderators for review. You will be notified when your appeal has been approved or rejected. If your appeal is rejected, you may not appeal again.\n\nIf you are unable to DM me because we do not have any mutual servers, you may use this invite to gain a mutual server and then DM me your appeal.\nhttps://discord.gg/TEXjY6e\n\nYou will want to remain in this mutual server until after your appeal has been approved so that you can be notified of the appeal result.`, { split: true });

		const banning: Message = <Message> await message.channel.send(`Banning ${user.username}#${user.discriminator}...`);

		this.bot.mod.actions.ban(user, message.guild);
		let banCase: Message = <Message> await this.bot.mod.logger.awaitCase(message.guild, user, 'Ban');
		this.bot.mod.logger.editCase(message.guild, banCase, message.author, reason);

		console.log(`Banned ${user.username}#${user.discriminator} from guild '${message.guild.name}'`);
		banning.edit(`Successfully banned ${user.username}#${user.discriminator}`);
	}
}
