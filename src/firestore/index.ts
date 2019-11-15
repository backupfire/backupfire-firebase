import operationResponse from '../_lib/operationSuccess'
import asyncMiddleware from '../_lib/asyncMiddleware'
import { backupFirestore } from './backup'
import { checkFirestoreBackupStatus } from './status'
import { Response } from 'express'
import { getCollections } from './collections'

export type FirestoreBackupOptions = {
  bucketsAllowlist?: string[]
  projectId: string
}

export type FirestoreBackupRequestOptions = {
  storageId: string
  path: string
  ignoreCollections?: string[]
}

export function backupFirestoreMiddleware({
  bucketsAllowlist,
  projectId
}: FirestoreBackupOptions) {
  return asyncMiddleware(async (request, response) => {
    // TODO: Validate options
    const options = request.body as FirestoreBackupRequestOptions

    const allCollections = await getCollections()
    const { ignoreCollections } = options
    const exportedCollections = ignoreCollections
      ? allCollections.filter(coll => !ignoreCollections.includes(coll))
      : allCollections

    // Request Firestore backup
    const id = await backupFirestore(projectId, exportedCollections, options)

    return respondWithStatus(response, id, {
      exportedCollections,
      ignoredCollections: ignoreCollections || []
    })
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

async function respondWithStatus(
  response: Response,
  id: string,
  extraData: object = {}
) {
  const status = await checkFirestoreBackupStatus(id)
  operationResponse(response, {
    state: status.done ? 'completed' : 'pending',
    data: Object.assign({ id, status }, extraData)
  })
}

export function getCollectionsMiddleware() {
  return asyncMiddleware(async (_request, response) => {
    const collections = await getCollections()
    response.send(collections)
  })
}
