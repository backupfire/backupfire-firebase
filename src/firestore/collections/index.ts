import * as admin from 'firebase-admin'

export async function getCollections() {
  const collections = await admin.firestore().listCollections()
  return collections.map(collection => {
    return collection.path
  })
}
