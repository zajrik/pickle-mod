/**
 * Storage entry containing all users with active mutes
 * and their Mute objects representing mutes in each guild
 */
type ActiveMutes = { [id: string]: MuteObj[] }
