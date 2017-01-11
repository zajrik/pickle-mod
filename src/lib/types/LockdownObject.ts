/**
 * A lockdown entry in storage. Contains information necessary
 * for later removal of the channel lockdown
 */
type LockdownObject = {
	message: string;
	channel: string;
	allow: number;
	deny: number;
	duration: number;
	timestamp: number;
}
