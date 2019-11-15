import { FirestoreBackupRequestOptions } from '..'
import firestore from '@google-cloud/firestore'

type OperationResponse = {
  name: string // 'projects/backup-fire-staging/databases/(default)/operations/ASAxNjAwMzM3NTEyChp0bHVhZmVkBxJsYXJ0bmVjc3Utc2Jvai1uaW1kYRQKLRI'
  metadata: {
    type_url: string // 'type.googleapis.com/google.firestore.admin.v1.ExportDocumentsMetadata'
    value: Buffer // TODO: Figure out why Google returns malformed string like "�������:>gs://backup-fire-staging.appspot.com/2019-09-19T12:51:47_74849"
  }
  done: boolean
}

type ExportDocumentsResponse = [OperationResponse]

export async function backupFirestore(
  projectId: string,
  collectionIds: string[],
  options: FirestoreBackupRequestOptions
) {
  const client = new firestore.v1.FirestoreAdminClient()

  const databaseName = client.databasePath(projectId, '(default)')

  // https://googleapis.dev/nodejs/firestore/latest/v1.FirestoreAdminClient.html#exportDocuments
  const [operation] = (await client.exportDocuments({
    name: databaseName,
    outputUriPrefix: `gs://${options.storageId}/${options.path}`,
    collectionIds
  })) as ExportDocumentsResponse

  return operation.name
}
