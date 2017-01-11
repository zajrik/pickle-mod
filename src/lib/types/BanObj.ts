/**
 * Represents a ban entry in storage
 */
type BanObj = {
	user: string;
	raw: string;
	guild: string;
	guildName: string;
	timestamp: number;
}
