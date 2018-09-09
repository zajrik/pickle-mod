import { Client, Command } from '@yamdbf/core';
import { Message } from 'discord.js';
import { execSync } from 'child_process';

export default class extends Command<Client>
{
	public constructor()
	{
		super({
			name: '$',
			desc: 'Execute a bash command and print output',
			usage: '<prefix>$ <command> [...args]',
			group: 'system',
			ownerOnly: true
		});
	}

	public async action(message: Message, args: string[]): Promise<any>
	{
		if (!args[0])
			return message.channel.send('You must provide a command to execute.')
				.then((res: Message) => res.delete({ timeout: 5000 }));

		if (args.includes('rm') || args.includes('sudo') || args.includes('su'))
			return message.channel.send('Forbidden.')
				.then((res: Message) => res.delete({ timeout: 5000 }));

		let result: string;
		const execution: Message = <Message> await message.channel.send('_Executing..._');

		try { result = execSync(args.join(' '), { timeout: 10000 }).toString(); }
		catch (err) { result = err; }

		const output: string = `**INPUT:**\n\`\`\`bash\n$ ${args.join(' ')}\n\`\`\`\n**OUTPUT:**`;
		await execution.delete();
		await message.channel.send(output);
		return message.channel.send(this._clean(result), { split: true, code: 'ts' });
	}

	private _clean(text: string): string
	{
		return typeof text === 'string' ? text
			.replace(/`/g, `\`${String.fromCharCode(8203)}`)
			.replace(/@/g, `@${String.fromCharCode(8203)}`)
			.replace(/[\w\d]{24}\.[\w\d]{6}\.[\w\d-_]{27}/g, '[REDACTED]')
			.replace(/email: '[^']+'/g, `email: '[REDACTED]'`)
			.replace(this.client.token, '[REDACTED]')
			: text;
	}
}
