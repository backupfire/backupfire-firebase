import backupfire from '../../src'
import * as admin from 'firebase-admin'

admin.initializeApp()

export const backup = backupfire({
  controllerToken: 'jc3PJUnjp45FIZyCPwCGWtM2LZ0rLQlORtDDpoIIN620pzvI',
  controllerDomain: 'staging.backupfire.dev',
  adminPassword: 'misstep-overt-woodyard-fest-zinc-persist'
})
