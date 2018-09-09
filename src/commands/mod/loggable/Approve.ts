import { Command, ClientStorage, Message } from '@yamdbf/core';
import { User } from 'discord.js';
import { ModClient } from '../../../client/ModClient';

export default class extends Command<ModClient>
{
	public constructor()
	{
		super({
			name: 'approve',
			desc: 'Approve an appeal',
			usage: '<prefix>approve <id>',
			group: 'mod',
			guildOnly: true
		});
	}

	public async action(message: Message, args: string[]): Promise<any>
	{
		if (!this.client.mod.canCallModCommand(message))
			return this.client.mod.sendModError(message);

		const appealsChannel: string = await message.guild.storage.settings.get('appeals');
		if (message.channel.id !== appealsChannel)
			return message.channel.send('Approve command may only be run in the appeals channel.');

		message.delete();
		const id: string = <string> args[0];
		if (!id) return message.channel.send('You must provide an appeal ID to approve.')
			.then((res: Message) => res.delete({ timeout: 5e3 }));

		const storage: ClientStorage = this.client.storage;
		const appeal: string = (await storage.get('activeAppeals'))[id];
		if (!appeal) return message.channel.send('Could not find an appeal with that ID.')
			.then((res: Message) => res.delete({ timeout: 5e3 }));

		const user: User = await this.client.users.fetch(id);
		this.client.mod.logs.setCachedCase(message.guild, user, 'Unban');
		try { await this.client.mod.actions.unban(user.id, message.guild); }
		catch
		{
			this.client.mod.logs.removeCachedCase(message.guild, user, 'Unban');
			return message.channel.send(`Failed to unban ${user.tag}`)
				.then((res: Message) => res.delete({ timeout: 5e3 }));
		}
		await this.client.mod.logs.logCase(user, message.guild, 'Unban', 'Approved appeal', message.author);

		message.channel.send(`Approved appeal \`${id}\`. Unbanned ${user.tag}`)
			.then((res: Message) => res.delete({ timeout: 5e3 }));
	}
}
