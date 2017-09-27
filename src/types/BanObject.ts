/**
 * Represents a ban entry in storage
 */
type BanObject = {
	user: string;
	raw: string;
	guild: string;
	guildName: string;
	timestamp: number;
};
