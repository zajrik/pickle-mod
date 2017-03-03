import { Message, MessageOptions } from 'discord.js';
import { Command } from 'yamdbf';
import ModBot from '../lib/ModBot';

/**
 * Parse command args from a given string including
 * the prefix+command. Less complex than YAMDBF args
 * parsing with the intent of preserving mentions,
 * which YAMDBF will move into `mentions`
 */
export function parseArgs(text: string): string[]
{
	return text.split(' ')
		.slice(1)
		.map(a => a.trim())
		.filter(a => a !== '');
}

/**
 * Provide a prompt with a simple success regex that fails
 * if the regex is not matched. Resolves with a tuple containing
 * the PromptResult, as well as the message created by the prompt
 * and the user input message, in case something needs to be done
 * with those two messages
 */
export async function prompt(message: Message, prompt: string, condition: RegExp, options?: MessageOptions): Promise<[PromptResult, Message, Message]>
{
	const ask: Message = <Message> await message.channel.send(prompt, options);
	const confirmation: Message = (await message.channel.awaitMessages((a: Message) =>
		a.author.id === message.author.id, { max: 1, time: 20e3 })).first();

	if (!confirmation) return [PromptResult.TIMEOUT, ask, confirmation];
	if (!condition.test(confirmation.content)) return [PromptResult.FAILURE, ask, confirmation];
	return [PromptResult.SUCCESS, ask, confirmation];
}

/**
 * Represents possible results of Util#prompt
 */
export enum PromptResult
{
	SUCCESS,
	FAILURE,
	TIMEOUT
}

/**
 * Cancel a mod command if the caller cannot call it,
 * sending the appropriate error to the channel
 */
export function modCommand(message: Message, args: any[]): any
{
	if (!(<Command<ModBot>> this).bot.mod.canCallModCommand(message))
		return (<Command<ModBot>> this).bot.mod.sendModError(message);
	return [message, args];
}
