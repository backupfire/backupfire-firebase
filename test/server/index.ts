import backupfire from '../../src'
import * as admin from 'firebase-admin'

admin.initializeApp()

export const backup = backupfire()
