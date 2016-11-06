'use strict';
import { Bot, LocalStorage } from 'yamdbf';

/**
 * A timer for bots that allows registering callback functions that
 * will fire at the specified intervals. Timers will resume where
 * they left off when restarted. Intervals must be in seconds.
 */
export default class Timer
{
	private _bot: Bot;
	private _interval: number;
	private _callback: () => void;
	private _storage: LocalStorage;
	private _ticks: number;
	public name: string;

	public constructor(bot: Bot, name: string, interval: number, callback: () => void)
	{
		this.name = name;
		this._storage = new LocalStorage('storage/timer-storage');
		this._bot = bot;
		this._interval = interval;
		this._callback = callback;
		this._ticks = this._storage.getItem(this.name) || 0;

		this._bot.setInterval(async () =>
		{
			if (this._ticks >= this._interval) this._ticks = 0;
			if (this._ticks === 0)
			try
			{
				await this._callback();
			}
			catch (err)
			{
				console.log(err.stack);
			}
			this._storage.setItem(this.name, this._ticks++);
		}, 1000);
	}
}
