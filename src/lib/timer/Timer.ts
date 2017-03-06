import { Bot, LocalStorage } from 'yamdbf';

/**
 * A timer for bots that allows registering callback functions that
 * will fire at the specified intervals. Timers will resume where
 * they left off when restarted. Intervals must be in seconds.
 */
export default class Timer
{
	private _bot: Bot;
	private _interval: int;
	/** Must be async */
	private _callback: () => Promise<void>;
	private _storage: LocalStorage;
	private _ticks: int;
	private _timer: NodeJS.Timer;
	public name: string;

	public constructor(bot: Bot, name: string, interval: int, callback: () => Promise<void>)
	{
		this.name = name;
		this._storage = new LocalStorage(`storage/timers/${this.name}`);
		this._bot = bot;
		this._interval = interval;
		this._callback = callback;
		this._ticks = this._storage.getItem(this.name) || 0;

		this.create();
	}

	/**
	 * Create the timer. Called automatically by the constructor
	 * when the timer is first created. Can be called again to
	 * recreate the timer if it has been destroyed.
	 */
	public create(): void
	{
		if (this._timer) throw new Error('Timer has already been created.');
		this._timer = this._bot.setInterval(async () =>
		{
			if (this._ticks >= this._interval) this._ticks = 0;
			if (this._ticks++ === 0) this._callback().catch(console.error);
			this._storage.setItem(this.name, this._ticks);
		}, 1000);
	}

	/**
	 * Destroy the timer, resetting ticks and clearing the interval.
	 * The timer can be created again with `<Timer>.create()`
	 */
	public destroy(): void
	{
		this._bot.clearInterval(this._timer);
		this._ticks = 0;
		this._timer = null;
		this._storage.setItem(this.name, this._ticks);
	}
}
