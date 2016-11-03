'use strict';
import { Bot, BotOptions } from 'yamdbf';
import ModActions from './ModActions';
import TimerCollection from './timer/TimerCollection';
import Timer from './timer/Timer';

export default class ModBot extends Bot
{
	public timers: TimerCollection<string, Timer>;
	public mod: ModActions;

	public constructor(botOptions: BotOptions)
	{
		super(botOptions);
		this.timers = new TimerCollection<string, Timer>();
	}
}
