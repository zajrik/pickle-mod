import { Command, ClientStorage, Message } from 'yamdbf';
import { User } from 'discord.js';
import { ModClient } from '../../../lib/ModClient';

export default class extends Command<ModClient>
{
	public constructor(client: ModClient)
	{
		super(client, {
			name: 'approve',
			aliases: [],
			description: 'Approve an appeal',
			usage: '<prefix>approve <id>',
			extraHelp: '',
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
			.then((res: Message) => res.delete(5e3));

		const storage: ClientStorage = this.client.storage;
		const appeal: string = (await storage.get('activeAppeals'))[id];
		if (!appeal) return message.channel.send('Could not find an appeal with that ID.')
			.then((res: Message) => res.delete(5e3));

		const user: User = await this.client.mod.actions.unban(id, message.guild);
		const unbanCase: Message = <Message> await this.client.mod.logs.awaitBanCase(message.guild, user, 'Unban');
		this.client.mod.logs.editCase(message.guild, unbanCase, message.author, 'Approved appeal');

		message.channel.send(`Approved appeal \`${id}\`. Unbanned ${user.username}#${user.discriminator}`)
			.then((res: Message) => res.delete(5e3));
	}
}
