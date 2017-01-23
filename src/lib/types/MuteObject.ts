/**
 * Represents a mute entry in storage
 */
type MuteObject = {
	raw: string;
	user: string;
	guild: string;
	duration?: number;
	timestamp: number;
}
