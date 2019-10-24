import backupfireAgent from '../../src'
import * as admin from 'firebase-admin'

admin.initializeApp()

export const backupfire = backupfireAgent()
