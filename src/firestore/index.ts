import operationResponse from '../_lib/operation'
import asyncMiddleware from '../_lib/asyncMiddleware'
import { backupFirestore } from './backup'
import { checkFirestoreBackupStatus } from './status'
import { Response } from 'express'
import { getCollections } from './collections'
import * as functions from 'firebase-functions'

export interface FirestoreBackupOptions {
  bucketsAllowlist?: string[]
  projectId: string
}

export type FirestoreBackupRequestBody =
  | FirestoreBackupRequestBodyComplete
  | FirestoreBackupRequestBodySelective

export interface FirestoreBackupRequestBodyBase {
  storageId: string
  path: string
}

export interface FirestoreBackupRequestBodyComplete
  extends FirestoreBackupRequestBodyBase {
  mode: 'complete'
}

export interface FirestoreBackupRequestBodySelective
  extends FirestoreBackupRequestBodyBase {
  mode: 'selective'
  ignoreCollections?: string[]
  collectionGroups?: string[]
}

export function backupFirestoreMiddleware({
  bucketsAllowlist,
  projectId,
}: FirestoreBackupOptions) {
  return asyncMiddleware(async (request, response) => {
    // TODO: Validate body
    const body = request.body as FirestoreBackupRequestBody

    if (body.mode === 'selective') {
      functions.logger.info('Requested Firestore backup', {
        // NOTE: Do not ...body here to avoid logging sensitive data
        mode: body.mode,
        ignoreCollections: body.ignoreCollections,
        collectionGroups: body.collectionGroups,
        bucketsAllowlist,
        projectId,
      })

      // Get all root-level collections
      const allCollections = await getCollections()
      const { ignoreCollections, collectionGroups } = body
      const exportedCollections = (
        ignoreCollections
          ? allCollections.filter((coll) => !ignoreCollections.includes(coll))
          : allCollections
      ).concat(collectionGroups || [])

      functions.logger.info('Initiating selective Firestore backup', {
        exportedCollections,
        ignoreCollections,
      })

      // Request selective Firestore backup
      const id = await backupFirestore(projectId, exportedCollections, body)

      if (id) {
        return respondWithStatus(response, id, {
          exportedCollections: exportedCollections.filter(
            (coll) => !collectionGroups?.includes(coll)
          ),
          ignoredCollections: ignoreCollections || [],
          exportedCollectionGroups: collectionGroups || [],
        })
      } else {
        return respondWithMissingId(response)
      }
    } else {
      functions.logger.info('Requested Firestore backup', {
        // NOTE: Do not ...body here to avoid logging sensitive data
        mode: body.mode,
        bucketsAllowlist,
        projectId,
      })

      // NOTE: Back-to-back logging here is to reflect the selective backup logging
      functions.logger.info('Initiating complete Firestore backup')

      // Request complete Firestore backup
      const id = await backupFirestore(projectId, undefined, body)

      if (id) {
        return respondWithStatus(response, id)
      } else {
        return respondWithMissingId(response)
      }
    }
  })
}

export interface FirestoreCheckBackupStatusRequestOptions {
  id: string
}

export function checkFirestoreBackupStatusMiddleware() {
  return asyncMiddleware(async (request, response) => {
    // TODO: Validate query
    const query =
      request.query as unknown as FirestoreCheckBackupStatusRequestOptions

    functions.logger.info('Requested Firestore backup status')

    return respondWithStatus(response, query.id)
  })
}

async function respondWithStatus(
  response: Response,
  id: string,
  extraData: object = {}
) {
  functions.logger.info('Checking the backup status', { id })

  const status = await checkFirestoreBackupStatus(id)
  const state = status.done ? 'completed' : 'pending'

  functions.logger.info('Responding with the backup status', { id, state })

  operationResponse(response, {
    state,
    data: Object.assign({ id, status }, extraData),
  })
}

function respondWithMissingId(response: Response) {
  functions.logger.info('Responding with missing id error')

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
    functions.logger.info('Requested Firestore collections')

    const collections = await getCollections()

    functions.logger.info('Responding with Firestore collections', {
      collections,
    })

    response.send(collections)
  })
}
