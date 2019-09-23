import firestore from '@google-cloud/firestore'

const client = new firestore.v1.FirestoreAdminClient()
export default client
