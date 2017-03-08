/**
 * A lockdown entry in storage. Contains information necessary
 * for later removal of the channel lockdown
 */
type LockdownObject = {
	channel: string;
	allow: number;
	deny: number;
	expires: number;
}
