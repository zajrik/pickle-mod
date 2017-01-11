/**
 * Storage entry containing all users with active bans
 * and their ban objects representing bans in each guild
 */
type ActiveBans = { [id: string]: BanObj[] }
