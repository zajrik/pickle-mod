import { Command, Message, Middleware } from 'yamdbf';
import { User, GuildMember, RichEmbed } from 'discord.js';
import { prompt, PromptResult } from '../../../lib/Util';
import { modCommand } from '../../../lib/Util';
import ModBot from '../../../lib/ModBot';

export default class Ban extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'ban',
			aliases: ['b&', 'banne'],
			description: 'Ban a user',
			usage: '<prefix>ban <user> <...reason>',
			group: 'mod',
			guildOnly: true
		});

		this.use(modCommand);

		const { resolveArgs, expect } = Middleware;
		this.use(resolveArgs({ '<user>': 'User', '<...reason>': 'String' }));
		this.use(expect({ '<user>': 'User', '<...reason>': 'String' }));
	}

	public async action(message: Message, [user, reason]: [User, string]): Promise<any>
	{
		if (user.id === message.author.id)
			return message.channel.send(`I don't think you want to ban yourself.`);

		let member: GuildMember;
		try { member = await message.guild.fetchMember(user); }
		catch (err) {}

		const modRole: string = message.guild.storage.getSetting('modrole');
		if ((member && member.roles.has(modRole)) || user.id === message.guild.ownerID || user.bot)
			return message.channel.send('You may not use this command on that user.');

		const offenses: any = this.bot.mod.actions.checkUserHistory(message.guild, user);
		const embed: RichEmbed = new RichEmbed()
			.setColor(offenses.color)
			.setDescription(`**Reason:** ${reason}`)
			.setAuthor(`${user.username}#${user.discriminator}`, user.avatarURL)
			.setFooter(offenses.toString());

		const [result]: [PromptResult] = <[PromptResult]> await prompt(message,
			'Are you sure you want to issue this ban? (__y__es | __n__o)',
			/^(?:yes|y)$/i, /^(?:no|n)$/i, { embed });
		if (result === PromptResult.TIMEOUT) return message.channel.send('Command timed out, aborting ban.');
		if (result === PromptResult.FAILURE) return message.channel.send('Okay, aborting ban.');

		try
		{
			await user.send(`**You have been banned from ${message.guild.name}.**\n\n**Reason:** ${reason}\n\nYou can appeal your ban by DMing me the command \`appeal <message>\`, where \`'<message>'\` is a message detailing why you think you deserve to have your ban lifted. You must send this command without a prefix or I won't recognize it. If you are currently banned from more than one server that I serve, you may only appeal the most recent ban until that appeal is approved or rejected.\n\nAfter you have sent your appeal it will be passed to the server moderators for review. You will be notified when your appeal has been approved or rejected. If your appeal is rejected, you may not appeal again.\n\nIf you are unable to DM me because we do not have any mutual servers, you may use this invite to gain a mutual server and then DM me your appeal.\nhttps://discord.gg/TEXjY6e\n\nYou will want to remain in this mutual server until after your appeal has been approved so that you can be notified of the appeal result.`, { split: true });
		}
		catch (err) { console.log(`Failed to send ban DM to ${user.username}#${user.discriminator}`); }

		const banning: Message = <Message> await message.channel.send(
			`Banning ${user.username}#${user.discriminator}...`);

		this.bot.mod.actions.ban(user, message.guild);
		let banCase: Message = <Message> await this.bot.mod.logger.awaitBanCase(message.guild, user, 'Ban');
		this.bot.mod.logger.editCase(message.guild, banCase, message.author, reason);

		console.log(`Banned ${user.username}#${user.discriminator} from guild '${message.guild.name}'`);
		banning.edit(`Successfully banned ${user.username}#${user.discriminator}`);
	}
}
