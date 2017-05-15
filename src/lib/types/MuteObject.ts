/**
 * Represents a mute entry in storage
 */
type MuteObject = {
	member: string;
	guild: string;
	expires?: number;
	leftGuild?: boolean;
};
