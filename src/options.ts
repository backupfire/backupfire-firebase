export const defaultControllerDomain = 'backupfire.dev'

export const defaultRegion = 'us-central1'

/**
 * The default function timeout - 9 minutes. It ensures that the user backups
 * are completed regardless of how many there are.
 *
 * Unlike the memory runtime option, timeout doesn't affect the function
 * instance price, so it's safe to set it to max.
 */
export const defaultTimeout = 540

/**
 * The default function memory. With the increased timeout, it ensures
 * the users' backup completion.
 *
 * Internal testing shows that 1GB is the sweet spot. It's still cheap to run
 * and gives room to process huge backups.
 */
export const defaultMemory = '1GB'
