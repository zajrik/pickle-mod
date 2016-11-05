'use strict';
import { Collection } from 'discord.js';
import Timer from './Timer';

/**
 * Collection designed for containg Timer objects. Allows use
 * of the `add` method to add Timers to the collection without
 * needing to provide a key
 */
export default class TimerCollection<key, value> extends Collection<string, Timer>
{
	public constructor() { super(); }

	/**
	 * Add the Timer to the collection using Timer#name as
	 * the key while preventing duplicates or overwriting
	 * of old timer instances
	 * 
	 * Identical to: Collection.set(Timer.name, Timer)
	 */
	public add(timer: Timer): this
	{
		if (super.has(timer.name)) throw new Error(`Timer "${timer.name}" already exists in this collection.`);
		return super.set(timer.name, timer);
	}
}
