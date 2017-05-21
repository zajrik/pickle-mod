import { Command, Message, Middleware, CommandDecorators, Time, Logger, logger, GuildSettings } from 'yamdbf';
import { TextChannel } from 'discord.js';
import { ModClient } from '../../lib/ModClient';
import { LockdownManager } from '../../lib/mod/managers/LockdownManager';
import { modOnly } from '../../lib/Util';

const { resolveArgs, expect } = Middleware;
const { using } = CommandDecorators;

export default class extends Command<ModClient>
{
	@logger private readonly logger: Logger;
	public constructor(client: ModClient)
	{
		super(client, {
			name: 'mentionspam',
			description: 'Configure mention spam filtering',
			usage: `<prefix>mentionspam <'on'|'off'> ['kick'|'mute'|'ban'] [num]`,
			extraHelp: `If 'on', action type and threshold (labeled 'num' in Usage) must be specified. Threshold is the base number of mentions in a short period of time before action is taken and action type is what will be done when the filter is triggered.\n\nValid action types are 'kick', 'mute', and 'ban'. 'mute' is not valid if a mute role is not configured in your server.\n\nThe threshold provided will scale up with regards to how long a member has been on your server. This effect diminishes as the number of days increases. If threshold is omitted it will default to 6, or whatever you had set it to already if the filter has been activated before.`,
			group: 'mod',
			guildOnly: true
		});
	}

	@modOnly
	@using(async function(this: Command<ModClient>, message, args: string[])
	{
		const usage: string = this.usage.replace('<prefix>', await this.client.getPrefix(message.guild));
		if (args[0] === 'off') return [message, [args[0]]];
		else if (args[0] === 'on') return resolveArgs(
			{ '<on|off>': 'String', '<type>': 'String', '<threshold>': 'Number' })
			.call(this, message, args);
		else throw new Error(`Invalid input: First argument must be \`on\` or \`off\`\nUsage: \`${usage}\``);
	})
	public async action(message: Message, [state, type, threshold]: [string, string, int]): Promise<any>
	{
		if (!(this.client.isOwner(message.author)
			|| (<TextChannel> message.channel).permissionsFor(message.member).has('MANAGE_GUILD')))
			return message.channel.send('You must have `Manage Server` permissions to use this command.');

		const settings: GuildSettings = message.guild.storage.settings;
		const usage: string = this.usage.replace('<prefix>', await settings.get('prefix'));
		if (state === 'off')
		{
			await settings.set('mentionSpam', false);
			return message.channel.send('Mention spam filter: **OFF**');
		}

		if (type)
		{
			if (!/kick|mute|ban/.test(type)) return message.channel.send(
				`Error: Invalid input: Type must be \`kick\`, \`mute\`, or \`ban\`\nUsage: \`${usage}\``);
			if (type === 'mute' && !this.client.mod.hasSetMutedRole)
				return message.channel.send('Error: This server does not have a configured Mute role');
			await settings.set('mentionSpam:type', type);
		}

		if (typeof threshold !== 'undefined')
		{
			threshold = Math.max(1, threshold) || 6;
			await settings.set('mentionSpam:threshold', threshold);
		}
		else threshold = await settings.get('mentionSpam:threshold');

		await settings.set('mentionSpam', true);
		let output: string[] = [
			`Mention spam filter: **ON**`,
			`Action type: ${type || await settings.get('mentionSpam:type')}`,
			`Base threshold: ${threshold}`
		];
		await message.channel.send(output);
	}
}
