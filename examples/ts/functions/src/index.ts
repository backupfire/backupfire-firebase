import * as functions from 'firebase-functions'
// 1. Import the agent package
import backupfireAgent from '@backupfire/firebase'

exports.helloWorld = functions.https.onRequest((_request, response) => {
  response.send('Hello from Firebase!')
})

// 2. Create and export the agent
export const backupfire = backupfireAgent()
