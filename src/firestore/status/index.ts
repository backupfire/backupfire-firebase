import { google } from 'googleapis'
import { FirestoreCheckBackupStatusRequestOptions } from '..'
import { GaxiosPromise } from 'gaxios'

type OperationProgressWork = {
  estimatedWork: string // number as string
  completedWork: string // same as above
}

type OperationState =
  | 'STATE_UNSPECIFIED'
  | 'INITIALIZING'
  | 'PROCESSING'
  | 'CANCELLING'
  | 'FINALIZING'
  | 'SUCCESSFUL'
  | 'FAILED'
  | 'CANCELLED'

type GetOperationResponse = GaxiosPromise<{
  name: string // 'projects/backup-fire-staging/databases/(default)/operations/ASA2MTAwMTYyNDEyChp0bHVhZmVkBxJsYXJ0bmVjc3Utc2Jvai1uaW1kYRQKLRI'
  metadata: {
    '@type': string // 'type.googleapis.com/google.firestore.admin.v1.ExportDocumentsMetadata'
    startTime: string // '2019-09-19T08:00:00.717192Z'
    endTime: string // '2019-09-19T08:00:48.955036Z'
    operationState: OperationState
    progressDocuments: OperationProgressWork
    progressBytes: OperationProgressWork
    collectionIds?: string[]
    outputUriPrefix: string // 'gs://backup-fire-staging.appspot.com/2019-09-19T08:00:00_29822'
  }
  done: boolean
  response: {
    '@type': 'type.googleapis.com/google.firestore.admin.v1.ExportDocumentsResponse'
    outputUriPrefix: string // 'gs://backup-fire-staging.appspot.com/2019-09-19T08:00:00_29822'
  }
}>

type OperationStatusProgress = {
  estimatedWork: number
  completedWork: number
}

export type OperationStatus = {
  startTime: string
  endTime?: string
  done?: boolean
  progressDocuments?: OperationStatusProgress
  progressBytes?: OperationStatusProgress
}

export async function checkFirestoreBackupStatus(
  id: string
): Promise<OperationStatus> {
  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/datastore'
    ]
  })
  const authClient = await auth.getClient()
  const firestore = google.firestore({
    version: 'v1',
    auth: authClient
  })
  const response = await (firestore.projects.databases.operations.get({
    name: id
  }) as GetOperationResponse)

  const {
    done,
    metadata: { startTime, endTime, progressDocuments, progressBytes }
  } = response.data

  return {
    startTime,
    endTime,
    done,
    progressDocuments: progressDocuments && parseProgress(progressDocuments),
    progressBytes: progressBytes && parseProgress(progressBytes)
  }
}

function parseProgress(
  progress: OperationProgressWork
): OperationStatusProgress {
  return {
    estimatedWork: parseInt(progress.estimatedWork),
    completedWork: parseInt(progress.completedWork)
  }
}
