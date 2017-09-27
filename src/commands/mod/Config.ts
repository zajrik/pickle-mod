import { Command, Message, Middleware, CommandDecorators } from 'yamdbf';
import { TextChannel, Role, RichEmbed } from 'discord.js';
import { ModClient } from '../../client/ModClient';
import { prompt, PromptResult } from '../../util/Util';
import { ModLoader } from '../../client/ModLoader';

const { resolve, expect } = Middleware;
const { using } = CommandDecorators;

export default class extends Command<ModClient>
{
	public constructor()
	{
		super({
			name: 'config',
			desc: 'Configure options for the server',
			usage: '<prefix>config <option> [...value]\nOptions: mod | mute | logs | appeals | status | reset',
			info: 'Uses a fuzzy-ish search to find channels and roles. For example, if you want to set your logging channel to a channel called "mod-logs" you can do:\n\n\t<prefix>config mod mod logs',
			group: 'mod',
			guildOnly: true
		});
	}

	@using(function(message, args: string[])
	{
		if (args[0] && !['reset', 'status'].includes(args[0].toLowerCase()))
			return expect('option: String, ...value?: Any')
				.call(this, message, args);

		else return expect('option: String').call(this, message, args);
	})
	@using(function(message, args: string[])
	{
		if (['logs', 'appeals'].includes(args[0].toLowerCase()))
			return resolve('option: String, ...value?: Channel')
				.call(this, message, args);

		else if (['mod', 'mute'].includes(args[0].toLowerCase()))
			return resolve('options: String, ...value?: Role')
				.call(this, message, args);

		else return [message, args];
	})
	public async action(message: Message, [option, value]: [string, Role | TextChannel | string]): Promise<any>
	{
		if (!(this.client.isOwner(message.author)
			|| (<TextChannel> message.channel).permissionsFor(message.member).has('MANAGE_GUILD')))
			return message.channel.send('You must have `Manage Server` permissions to use this command.');

		if (!/^(?:mod|mute|logs|appeals|status|reset)$/i.test(option))
			return message.channel.send(`Invalid option: \`${option}\`\nUsage: \`${this.usage}\``);

		const mod: ModLoader = this.client.mod;
		let [modRoleSet, logs, appeals, mute]: boolean[] = [
			await mod.hasSetModRole(message.guild),
			await mod.hasLoggingChannel(message.guild),
			await mod.hasAppealsChannel(message.guild),
			await mod.hasSetMutedRole(message.guild)
		];

		function check(bool: boolean): string
		{
			return bool ? '\\✅' : '\\❌';
		}

		switch (option.toLowerCase())
		{
			case 'mod':
				await message.guild.storage.settings.set('modrole', (<Role> value).id);
				return message.channel.send(`Set mod role to ${value}`);

			case 'mute':
				await message.guild.storage.settings.set('mutedrole', (<Role> value).id);
				return message.channel.send(`Set muted role to ${value}`);

			case 'logs':
				await message.guild.storage.settings.set('modlogs', (<TextChannel> value).id);
				return message.channel.send(`Set logs channel to ${value}`);

			case 'appeals':
				await message.guild.storage.settings.set('appeals', (<TextChannel> value).id);
				return message.channel.send(`Set appeals channel to ${value}`);

			case 'status':
				const embed: RichEmbed = new RichEmbed()
					.setColor(0xEFEAEA)
					.setAuthor('Server config status', this.client.user.avatarURL)
					.setDescription(`${check(modRoleSet)} **Mod role\n${check(logs)} Logs channel\n`
						+ `${check(appeals)} Appeals channel\n${check(mute)} Mute role**`);
				return message.channel.send({ embed });

			case 'reset':
				const [result]: [PromptResult] = <[PromptResult]> await prompt(message,
					'Are you sure you want to reset config? (__y__es | __n__o)',
					/^(?:yes|y)$/i, /^(?:no|n)$/i);
				if (result === PromptResult.TIMEOUT) return message.channel.send('Command timed out, aborting config reset.');
				if (result === PromptResult.FAILURE) return message.channel.send('Okay, aborting config reset.');

				for (const setting of ['modrole', 'mutedrole', 'modlogs', 'appeals'])
					await message.guild.storage.settings.remove(setting);

				return message.channel.send(
					`Server config reset. You'll need to reconfigure to be able to use mod commands again.`);
		}
	}
}
