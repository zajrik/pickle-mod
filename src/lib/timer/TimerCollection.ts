import { Collection } from 'discord.js';
import { Timer } from './Timer';

/**
 * Collection designed for containg Timer objects. Allows use
 * of the `add` method to add Timers to the collection without
 * needing to provide a key
 */
export class TimerCollection extends Collection<string, Timer>
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
		return this.set(timer.name, timer);
	}

	/**
	 * Ensure only Timer types are added to collection
	 */
	public set(key: string, value: Timer): this
	{
		if (!(value instanceof Timer)) throw new Error('TimerCollection only accepts Timer values');
		return super.set(key, value);
	}

	/**
	 * Destroy all timers, to be called by <Client>.destroy()
	 */
	public destroyAll(): void
	{
		super.forEach((timer: Timer) => timer.destroy());
	}
}
