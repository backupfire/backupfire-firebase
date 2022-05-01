const backupfireAgent = require('@backupfire/firebase')
const admin = require('firebase-admin')

admin.initializeApp()

exports.backupfire = backupfireAgent({
  controllerDomain: 'staging.backupfire.dev'
})
