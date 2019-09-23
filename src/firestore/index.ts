import operationSuccess from '../_lib/operationSuccess'
import asyncMiddleware from '../_lib/asyncMiddleware'
import { backupFirestore } from './backup'
import { checkFirestoreBackupStatus } from './status'

export type FirestoreBackupOptions = {
  bucketsWhitelist: string[]
}

export type FirestoreBackupRequestOptions = {
  bucket: string
}

export function backupFirestoreMiddleware({
  bucketsWhitelist
}: FirestoreBackupOptions) {
  return asyncMiddleware(async (request, response) => {
    // TODO: Validate options
    const options = request.body as FirestoreBackupRequestOptions

    const id = await backupFirestore(options)

    operationSuccess(response, { state: 'pending', data: { id } })
  })
}

export type FirestoreCheckBackupStatusRequestOptions = {
  id: string
}

export type BackupOperationResponse<OperationData> = {
  state: 'completed' | 'pending' | 'failed'
  data: OperationData
}

export function checkFirestoreBackupStatusMiddleware() {
  return asyncMiddleware(async (request, response) => {
    // TODO: Validate options
    const options = request.query as FirestoreCheckBackupStatusRequestOptions

    const status = await checkFirestoreBackupStatus(options)

    operationSuccess(response, {
      state: status.done ? 'completed' : 'pending',
      data: status
    })
  })
}
