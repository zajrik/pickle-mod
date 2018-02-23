import { Message, MessageOptions } from 'discord.js';
import { Command } from 'yamdbf';
import { ModClient } from '../client/ModClient';

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
 * Contains the different colors to be used
 * for moderation case logging
 */
export enum CaseTypeColors
{
	Unban = 8450847,
	Warn = 16776960,
	Mute = 16763904,
	Kick = 16745216,
	Softban = 16745216,
	Ban = 16718080
}

/**
 * Provide a prompt with simple success/failure expressions that
 * succeeds/fails if the respective expression is matched. Resolves
 * with a tuple containing the PromptResult, as well as the message
 * created by the prompt and the user input message, in case
 * something needs to be done with those two messages
 */
export async function prompt(
	message: Message,
	promptStr: string,
	success: RegExp,
	failure: RegExp,
	options?: MessageOptions): Promise<[PromptResult, Message, Message] | [PromptResult]>
{
	const ask: Message = <Message> await message.channel.send(promptStr, options);
	const confirmation: Message = (await message.channel.awaitMessages(a =>	a.author.id === message.author.id
		&& (success.test(a.content) || failure.test(a.content)), { max: 1, time: 20e3 })).first();

	if (!confirmation) return [PromptResult.TIMEOUT, ask, confirmation];
	if (!success.test(confirmation.content)) return [PromptResult.FAILURE, ask, confirmation];
	return [PromptResult.SUCCESS, ask, confirmation];
}

/**
 * Command action method decorator for rejecting command calls
 * from non-mods or improperly set up guilds
 */
export function modOnly(target: Command<ModClient>, key: string, descriptor: PropertyDescriptor): PropertyDescriptor
{
	if (!target) throw new Error('@modOnly must be used as a method decorator for a Command action method.');
	if (key !== 'action') throw new Error(`"${target.constructor.name}#${key}" is not a valid method target for @modOnly.`);
	if (!descriptor) descriptor = Object.getOwnPropertyDescriptor(target, key);
	const original: any = descriptor.value;
	descriptor.value = async function(message: Message, args: any[]): Promise<any>
	{
		const canCall: boolean = await (<Command<ModClient>> this).client.mod.canCallModCommand(message);
		if (!canCall) (<Command<ModClient>> this).client.mod.sendModError(message);
		else return await original.apply(this, [message, args]);
	};
	return descriptor;
}
