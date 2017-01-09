'use strict';

/**
 * Represents a difference between two given valid Unix time signatures
 */
type Difference = {
	ms?: int;
	days?: int;
	hours?: int;
	mins?: int;
	secs?: int;
	toString(): string;
	toSimplifiedString?(): string;
}

type int = number;

/**
 * Extend the Date class to provide helper methods
 */
export default class Time extends Date
{
	public constructor() { super(); }

	/**
	 * Return an object containing the time difference between a and b
	 */
	public static difference(a: int, b: int): Difference
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
			timeString.replace(/ays|ours|ins|ecs| /g, '').replace(/,/g, ' ').trim();

		return difference;
	}

	/**
	 * Parse a duration shorthand and return the duration in ms
	 * 
	 * Shorthand examples: 10m, 5h, 1d
	 */
	public static parseShorthand(shorthand: string): int
	{
		let duration: int, match: RegExpMatchArray;
		if (/^(?:\d+(?:\.\d+)?)[s|m|h|d]$/.test(<string> shorthand))
		{
			match = shorthand.match(/(\d+(?:\.\d+)?)(s|m|h|d)$/);
			duration = parseFloat(match[1]);
			duration = match[2] === 's'
				? duration * 1000 : match[2] === 'm'
				? duration * 1000 * 60 : match[2] === 'h'
				? duration * 1000 * 60 * 60 : match[2] === 'd'
				? duration * 1000 * 60 * 60 * 24 : null;
		}
		return duration;
	}
}
