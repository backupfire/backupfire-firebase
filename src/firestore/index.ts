import operationResponse from '../_lib/operation'
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
} & (
  | {
      mode: 'complete'
    }
  | {
      mode: 'selective'
      ignoreCollections?: string[]
      collectionGroups?: string[]
    }
)

export function backupFirestoreMiddleware({
  bucketsAllowlist,
  projectId,
}: FirestoreBackupOptions) {
  return asyncMiddleware(async (request, response) => {
    // TODO: Validate options
    const options = request.body as FirestoreBackupRequestOptions

    if (options.mode === 'selective') {
      // Get all root-level collections
      const allCollections = await getCollections()
      const { ignoreCollections, collectionGroups } = options
      const exportedCollections = (ignoreCollections
        ? allCollections.filter((coll) => !ignoreCollections.includes(coll))
        : allCollections
      ).concat(collectionGroups || [])

      // Request selective Firestore backup
      const id = await backupFirestore(projectId, exportedCollections, options)

      if (id) {
        return respondWithStatus(response, id, {
          exportedCollections,
          ignoredCollections: ignoreCollections || [],
        })
      } else {
        return respondWithMissingId(response)
      }
    } else {
      // Request complete Firestore backup
      const id = await backupFirestore(projectId, undefined, options)

      if (id) {
        return respondWithStatus(response, id)
      } else {
        return respondWithMissingId(response)
      }
    }
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
    data: Object.assign({ id, status }, extraData),
  })
}

function respondWithMissingId(response: Response) {
  operationResponse(response, {
    state: 'failed',
    data: {
      reason:
        'Firestore backup failed to initiate: the operation response has no id.',
    },
  })
}

export function getCollectionsMiddleware() {
  return asyncMiddleware(async (_request, response) => {
    const collections = await getCollections()
    response.send(collections)
  })
}
