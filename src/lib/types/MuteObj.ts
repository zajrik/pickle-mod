/**
 * Represents a mute entry in storage
 */
type MuteObj = {
	raw: string;
	user: string;
	guild: string;
	duration: number;
	timestamp: number;
}
