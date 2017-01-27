/**
 * Parse command args from a given string including
 * the prefix+command. Less complex than YAMDBF args
 * parsing with the intent of preserving mentions,
 * which YAMDBF will move into `mentions`
 */
export function parseArgs(text: string): string[]
{
	return text.split(' ')
		.slice(1)
		.map(a => a.trim())
		.filter(a => a !== '');
}
