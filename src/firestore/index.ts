import operationResponse from '../_lib/operationSuccess'
import asyncMiddleware from '../_lib/asyncMiddleware'
import { backupFirestore } from './backup'
import { checkFirestoreBackupStatus } from './status'
import { Response } from 'express'

export type FirestoreBackupOptions = {
  bucketsAllowlist?: string[]
  projectId: string
}

export type FirestoreBackupRequestOptions = {
  storageId: string
  path: string
}

export function backupFirestoreMiddleware({
  bucketsAllowlist,
  projectId
}: FirestoreBackupOptions) {
  return asyncMiddleware(async (request, response) => {
    // TODO: Validate options
    const options = request.body as FirestoreBackupRequestOptions

    // Request Firestore backup
    const id = await backupFirestore(projectId, options)

    return respondWithStatus(response, id)
  })
}

export type FirestoreCheckBackupStatusRequestOptions = {
  id: string
}

export function checkFirestoreBackupStatusMiddleware() {
  return asyncMiddleware(async (request, response) => {
    // TODO: Validate options
    const options = request.query as FirestoreCheckBackupStatusRequestOptions
    return respondWithStatus(response, options.id)
  })
}

async function respondWithStatus(response: Response, id: string) {
  const status = await checkFirestoreBackupStatus(id)
  operationResponse(response, {
    state: status.done ? 'completed' : 'pending',
    data: { id, status }
  })
}
