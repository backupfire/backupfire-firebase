import backupfire from '@backupfire/firebase'
import * as admin from 'firebase-admin'

admin.initializeApp()

exports.backupfire = backupfire()
