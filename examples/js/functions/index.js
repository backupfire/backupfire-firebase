const functions = require('firebase-functions')
const admin = require('firebase-admin')
// 1. Import the agent package
const backupfireAgent = require('@backupfire/firebase')

admin.initializeApp()

exports.helloWorld = functions.https.onRequest((_request, response) => {
  response.send('Hello from Firebase!')
})

// 2. Create and export the agent
exports.backupfire = backupfireAgent()
