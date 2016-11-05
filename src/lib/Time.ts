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
		difference.toString = (): string => timeString.trim();

		// Returns the time string as '#d #h #m #s'
		difference.toSimplifiedString = (): string =>
			timeString.replace(/ours|ins|ecs| /g, '').replace(/,/g, ' ').trim();

		return difference;
	}

	/**
	 * Parse a duration shorthand and return the duration in ms
	 * 
	 * Shorthand examples: 10m, 5h, 1d
	 */
	public static parseShorthand(shorthand: string): number
	{
		let duration: number, match: RegExpMatchArray ;
		if (/^\d+[m|h|d]$/.test(<string> shorthand))
		{
			match = shorthand.match(/(\d+)(m|h|d)$/);
			duration = parseFloat(match[1]);
			duration = match[2] === 'm'
				? duration * 1000 * 60 : match[2] === 'h'
				? duration * 1000 * 60 * 60 : match[2] === 'd'
				? duration * 1000 * 60 * 60 * 24 : null;
		}
		return duration;
	}

	public constructor()
	{
		super();
	}
}
