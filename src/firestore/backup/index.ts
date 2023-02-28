import { FirestoreBackupRequestBody } from '..'
import firestore from '@google-cloud/firestore'

export async function backupFirestore(
  projectId: string,
  collectionIds: string[] | undefined,
  options: FirestoreBackupRequestBody
) {
  const client = new firestore.v1.FirestoreAdminClient()

  const databaseName = client.databasePath(projectId, '(default)')

  // https://googleapis.dev/nodejs/firestore/latest/v1.FirestoreAdminClient.html#exportDocuments
  const [operation] = await client.exportDocuments({
    name: databaseName,
    outputUriPrefix: `gs://${options.storageId}/${options.path}`,
    collectionIds,
  })

  return operation.name
}
