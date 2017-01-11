'use strict';
import { Bot, Command } from 'yamdbf';
import { User, Message } from 'discord.js';
import { execSync } from 'child_process';

export default class Bash extends Command<Bot>
{
	public constructor(bot: Bot)
	{
		super(bot, {
			name: '$',
			aliases: [],
			description: 'Execute a bash command and print output',
			usage: '<prefix>$ <command> [...args]',
			extraHelp: '',
			group: 'system',
			argOpts: { stringArgs: true },
			ownerOnly: true
		});
	}

	public async action(message: Message, args: Array<string | number>, mentions: User[], original: string): Promise<any>
	{
		message.delete();
		if (!args[0])
			return message.channel.send('You must provide a command to execute.')
				.then((res: Message) => res.delete(5000));
		if (args.includes('rm') || args.includes('sudo') || args.includes('su'))
			return message.channel.send('Forbidden.')
				.then((res: Message) => res.delete(5000));
		const execution: Message = <Message> await message.channel.send('_Executing..._');
		let result: string;
		try
		{
			result = execSync(args.join(' '), { cwd: '../', timeout: 10000 }).toString();
		}
		catch (err)
		{
			result = err;
		}
		const output: string = `**INPUT:**\n\`\`\`bash\n$ ${args.join(' ')}\n\`\`\`\n**OUTPUT:**`;
		return execution.delete().then(() =>
		{
			message.channel.send(output);
			message.channel.sendCode('ts', this._clean(result), { split: true });
		});
	}

	private _clean(text: string): string
	{
		return typeof text === 'string' ? text
			.replace(/`/g, `\`${String.fromCharCode(8203)}`)
			.replace(/@/g, `@${String.fromCharCode(8203)}`)
			.replace(/[\w\d]{24}\.[\w\d]{6}\.[\w\d-_]{27}/g, '[REDACTED]')
			.replace(/email: '[^']+'/g, `email: '[REDACTED]'`)
			: text;
	}
}
