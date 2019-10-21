const functions = require('firebase-functions')
// 1. Import the agent package
const backupfireAgent = require('@backupfire/firebase')

exports.helloWorld = functions.https.onRequest((_request, response) => {
  response.send('Hello from Firebase!')
})

// 2. Create and export the agent
exports.backupfire = backupfireAgent()
