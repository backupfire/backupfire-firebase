import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
// 1. Import the agent package.
// Make sure that you have esModuleInterop set to true in compilerOptions in your tsconfig.json!
import backupfireAgent from '@backupfire/firebase'

admin.initializeApp()

export const helloWorld = functions.https.onRequest((_request, response) => {
  response.send('Hello from Firebase!')
})

// 2. Create and export the agent
export const backupfire = backupfireAgent()
