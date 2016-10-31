'use strict';
import { Bot, BotOptions } from 'yamdbf';
import ModActions from './ModActions';

export default class ModBot extends Bot
{
	public mod: ModActions;
	public constructor(botOptions: BotOptions) { super(botOptions); }
}
