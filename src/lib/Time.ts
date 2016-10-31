type Difference = {
	ms?: number;
	days?: number;
	hours?: number;
	mins?: number;
	secs?: number;
	toString(): string;
	toSimplifiedString?(): string;
}

/**
 * Extend the Date class to provide helper methods
 */
export default class Time extends Date
{
	/**
	 * Return an object containing the time difference between a and be
	 * @param {int} a Time in milliseconds
	 * @param {int} b Time in milliseconds
	 * @returns {Object} object containing days, hours, mins, secs, and ms
	 *                  Also exposes two methods, toString and
	 *                  toSimplifiedString for the object
	 */
	public static difference(a: number, b: number): Difference
	{
		let difference: Difference = {};
		let ms: number = a - b;
		difference.ms = ms;

		// Calculate and separate days, hours, mins, and secs
		let days: number = Math.floor(ms / 1000 / 60 / 60 / 24);
		ms -= days * 1000 * 60 * 60 * 24;
		let hours: number = Math.floor(ms / 1000 / 60 / 60);
		ms -= hours * 1000 * 60 * 60;
		let mins: number = Math.floor(ms / 1000 / 60);
		ms -= mins * 1000 * 60;
		let secs: number = Math.floor(ms / 1000);

		let timeString: string = '';
		if (days) { difference.days = days; timeString += `${days} days${hours ? ', ' : ' '}`; }
		if (hours) { difference.hours = hours; timeString += `${hours} hours${mins ? ', ' : ' '}`; }
		if (mins) { difference.mins = mins; timeString += `${mins} mins${secs ? ', ' : ' '}`; }
		if (secs) { difference.secs = secs; timeString += `${secs} secs`; }

		// Returns the time string as '# days, # hours, # mins, # secs'
		difference.toString = (): string => timeString;

		// Returns the time string as '#d #h #m #s'
		difference.toSimplifiedString = (): string =>
			timeString.replace(/ours|ins|ecs| /g, '').replace(/,/g, ' ');

		return difference;
	}

	public constructor()
	{
		super();
	}
}
