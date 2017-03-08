/**
 * Represents the quantity and different kinds of moderation
 * actions that have been taken against a member in a guild
 */
type MemberHistory = {
	warn: int;
	mute: int;
	kick: int;
	ban: int;
}
