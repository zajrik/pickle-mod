import { Command, LocalStorage, GuildStorage } from 'yamdbf';
import { User, Message, TextChannel, Guild, RichEmbed } from 'discord.js';
import ModBot from '../../../lib/ModBot';

export default class Appeal extends Command<ModBot>
{
	public constructor(bot: ModBot)
	{
		super(bot, {
			name: 'appeal',
			aliases: [],
			description: 'Appeal a ban',
			usage: '<prefix>appeal <message>',
			extraHelp: '',
			group: 'mod'
		});
	}

	public async action(message: Message, args: string[]): Promise<any>
	{
		if (message.channel.type !== 'dm') return;
		const storage: LocalStorage = this.bot.storage;
		await storage.queue('activeBans', async (key: string) =>
		{
			const activeBans: ActiveBans = storage.getItem(key) || {};
			await storage.queue('activeAppeals', async (appealsKey: string) =>
			{
				const activeAppeals: ActiveAppeals = storage.getItem(appealsKey) || {};
				const bans: BanObject[] = activeBans[message.author.id];

				if (!bans) return message.channel.send('You do not have any bans eligible for appeal.');
				else if (activeAppeals && activeAppeals[message.author.id])
					return message.channel.send(
						`You currently have a pending appeal and may not place another until it has been reviewed.`);

				const ban: BanObject = bans.slice(-1)[0];
				const reason: string = args.join(' ');

				if (!reason) return message.channel.send(
					'You must provide an appeal message if you want to appeal a ban. Please limit the message to 1,000 characters or less.');

				if (reason.length > 1000) return message.channel.send(
					'You must limit your appeal message to 1,000 characters or less.');

				const guild: Guild = this.bot.guilds.get(ban.guild);
				const embed: RichEmbed = new RichEmbed()
					.setColor(65454)
					.setAuthor(ban.raw, message.author.avatarURL)
					.addField('Appeal message', reason)
					.addField('Actions',
						`To approve this appeal, use \`${this.bot.getPrefix(guild)}approve ${ban.user}\`\n`
						+ `To reject this appeal, use \`${this.bot.getPrefix(guild)}reject ${ban.user} <...reason>\``)
					.setTimestamp();

				const guildStorage: GuildStorage = this.bot.guildStorages.get(guild);
				const appeal: Message = <Message> await (<TextChannel> guild.channels
					.get(guildStorage.getSetting('appeals'))).sendEmbed(embed);

				activeAppeals[message.author.id] = appeal.id;
				storage.setItem(appealsKey, activeAppeals);
				message.channel.send(
					'Your appeal has been received. You will be notified when it is approved or rejected.');
			});
		});
	}
}
