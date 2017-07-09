import { Client, KeyedStorage, Providers } from 'yamdbf';
const { JSONProvider } = Providers;

/**
 * A timer for bots that allows registering callback functions that
 * will fire at the specified intervals. Timers will resume where
 * they left off when restarted. Intervals must be in seconds.
 */
export class Timer
{
	private _bot: Client;
	private _interval: int;
	/** Must be async */
	private _callback: () => Promise<void>;
	private _storage: KeyedStorage;
	private _ticks: int;
	private _timer: NodeJS.Timer;
	public name: string;

	public constructor(bot: Client, name: string, interval: int, callback: () => Promise<void>)
	{
		this.name = name;
		this._storage = new KeyedStorage(`timers/${this.name}`, JSONProvider);
		this._bot = bot;
		this._interval = interval;
		this._callback = callback;

		this.create();
	}

	/**
	 * Create the timer. Called automatically by the constructor
	 * when the timer is first created. Can be called again to
	 * recreate the timer if it has been destroyed.
	 */
	public async create(): Promise<void>
	{
		await this._storage.init();
		if (typeof this._ticks === 'undefined')
			this._ticks = await this._storage.get(this.name) || 0;

		if (this._timer) throw new Error('Timer has already been created.');
		this._timer = this._bot.setInterval(async () =>
		{
			if (this._ticks >= this._interval) this._ticks = 0;
			if (this._ticks++ === 0) this._callback().catch(console.error);
			await this._storage.set(this.name, this._ticks);
		}, 1000);
	}

	/**
	 * Destroy the timer, resetting ticks and clearing the interval.
	 * The timer can be created again with `<Timer>.create()`
	 */
	public async destroy(): Promise<void>
	{
		this._bot.clearInterval(this._timer);
		this._ticks = 0;
		this._timer = null;
		await this._storage.set(this.name, this._ticks);
	}
}
