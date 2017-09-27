/**
 * Represents a mention or group of mentions in a single mention
 * that a user has made, counting towards their total point
 * threshold for being banned for mention spamming
 */
type TrackedMention = { value: int, expires: int };
