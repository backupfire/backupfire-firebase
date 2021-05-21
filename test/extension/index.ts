import * as functions from 'firebase-functions'

export const helloWorld = functions.https.onRequest((_request, response) => {
  response.send('Hello from Firebase!')
})
