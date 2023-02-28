import asyncMiddleware from '../_lib/asyncMiddleware'
import { Storage as CloudStorage, Bucket } from '@google-cloud/storage'
import * as functions from 'firebase-functions'

export interface StorageOptions {
  bucketsAllowlist?: string[]
}

export function storageListMiddleware({ bucketsAllowlist }: StorageOptions) {
  return asyncMiddleware(async (request, response) => {
    functions.logger.info('Requested the storage list', { bucketsAllowlist })

    const storage = new CloudStorage()
    const [buckets] = await storage.getBuckets()
    const storageList: Storage[] = buckets.map(bucketAsStorage)

    functions.logger.info('Responding with the storage list', { storageList })

    response.send(storageList)
  })
}

interface StorageRetentionData {
  removeOldBackups: boolean
  keepBackupsValue: number
  keepBackupsUnit: KeepBackupsUnit
}

type KeepBackupsUnit = 'years' | 'months' | 'days'

export interface CreateStorageRequestBody
  extends Partial<StorageRetentionData> {
  storageId: string
  location: string
  storageClass?: 'standard' | 'nearline' | 'coldline' | 'archive'
}

export function createStorageMiddleware({ bucketsAllowlist }: StorageOptions) {
  return asyncMiddleware(async (request, response) => {
    const body = request.body as CreateStorageRequestBody

    functions.logger.info('Requested a bucket creation', {
      // NOTE: Do not ...body here to avoid logging sensitive data
      storageId: body.storageId,
      location: body.location,
      storageClass: body.storageClass,
      removeOldBackups: body.removeOldBackups,
      keepBackupsValue: body.keepBackupsValue,
      keepBackupsUnit: body.keepBackupsUnit,
      bucketsAllowlist,
    })

    const [bucket] = await new CloudStorage().createBucket(body.storageId, {
      [body.storageClass || 'nearline']: true,
      location: body.location,
    })

    functions.logger.info('Bucket created', { bucket: bucket.name })

    if (
      body.removeOldBackups &&
      body.keepBackupsValue &&
      body.keepBackupsUnit
    ) {
      const deleteAge = keepBackupInDays(
        body.keepBackupsValue,
        body.keepBackupsUnit
      )

      if (body.removeOldBackups) {
        functions.logger.info('Setting the bucket lifecycle', { deleteAge })

        await bucket.addLifecycleRule(
          {
            action: { type: 'Delete' },
            condition: { age: deleteAge },
          },
          { append: false }
        )
      } else {
        functions.logger.info('Clearing the bucket lifecycle')

        await bucket.setMetadata({ lifecycle: null })
      }
    }

    const [bucketData] = await bucket.get()
    const storage = bucketAsStorage(bucketData)

    functions.logger.info('Responding with the storage object', { storage })

    response.send(storage)
  })
}

export interface PasswordedStorageOptions extends StorageOptions {
  adminPassword: string
}

interface UpdateStorageRequestBody extends StorageRetentionData {
  password: string
}

export function updateStorageMiddleware({
  bucketsAllowlist,
  adminPassword,
}: PasswordedStorageOptions) {
  return asyncMiddleware(async (request, response) => {
    // TODO: Validate the payload
    const storageId = request.params.storageId as string
    const body = request.body as UpdateStorageRequestBody

    functions.logger.info('Requested a bucket update', {
      // NOTE: Do not ...body here to avoid logging sensitive data
      removeOldBackups: body.removeOldBackups,
      keepBackupsValue: body.keepBackupsValue,
      keepBackupsUnit: body.keepBackupsUnit,
      bucketsAllowlist,
    })

    if (body.password !== adminPassword) {
      functions.logger.info(
        'Admin password is incorrect, responding with an error'
      )

      response.status(403).send({ friendlyMessage: 'Wrong admin password' })
      return
    }

    const bucket = new CloudStorage().bucket(storageId)
    const deleteAge = keepBackupInDays(
      body.keepBackupsValue,
      body.keepBackupsUnit
    )

    if (body.removeOldBackups) {
      functions.logger.info('Setting the bucket lifecycle', { deleteAge })

      await bucket.addLifecycleRule(
        {
          action: { type: 'Delete' },
          condition: { age: deleteAge },
        },
        { append: false }
      )
    } else {
      functions.logger.info('Clearing the bucket lifecycle')

      await bucket.setMetadata({ lifecycle: null })
    }

    const [bucketData] = await bucket.get()
    const storage = bucketAsStorage(bucketData)

    functions.logger.info('Responding with the storage object', { storage })

    response.send(storage)
  })
}

export interface ListFilesRequestQuery {
  path: string
  maxResults: string | undefined
  startOffset: string | undefined
  endOffset: string | undefined
  prefix: string | undefined
}

export function listFilesMiddleware({ bucketsAllowlist }: StorageOptions) {
  return asyncMiddleware(async (request, response) => {
    const storageId = request.params.storageId as string
    const query = request.query as unknown as ListFilesRequestQuery

    functions.logger.info('Requested bucket files list', {
      // NOTE: Do not ...query here to avoid logging sensitive data
      storageId,
      path: query.path,
      maxResults: query.maxResults,
      startOffset: query.startOffset,
      endOffset: query.endOffset,
      prefix: query.prefix,
      bucketsAllowlist,
    })

    const bucket = new CloudStorage().bucket(storageId)
    const [files] = await bucket.getFiles({
      prefix: query.path,
      maxResults: query.maxResults ? parseInt(query.maxResults) : undefined,
      startOffset: query.startOffset,
      endOffset: query.endOffset,
      autoPaginate: !query.endOffset && !query.startOffset,
    })

    const result = files.map((file) => ({
      name: file.name,
      createdAt: file.metadata.timeCreated,
      updatedAt: file.metadata.updated,
      size: parseInt(file.metadata.size),
      contentType: file.metadata.contentType, // 'application/octet-stream'
      storageClass: file.metadata.storageClass, // 'STANDARD'
      storageClassUpdatedAt: new Date(file.metadata.timeStorageClassUpdated),
      etag: file.metadata.etag,
    }))

    response.send(result)
  })
}

function bucketAsStorage(bucket: Bucket): Storage {
  const {
    metadata: {
      name,
      id,
      location,
      storageClass,
      locationType,
      projectNumber,
      timeCreated,
      updated,
      lifecycle,
    },
  } = bucket

  return {
    name,
    id,
    location,
    projectNumber,
    storageClass,
    locationType,
    createdAt: new Date(timeCreated),
    updatedAt: new Date(updated),
    lifecycle: lifecycle && lifecycle.rule,
  }
}

export function keepBackupInDays(value: number, unit: KeepBackupsUnit) {
  // https://cloud.google.com/storage/docs/bucket-lock#retention-periods
  switch (unit) {
    case 'days':
      return value

    case 'months':
      return 31 * value

    case 'years':
      return Math.floor(365.25 * value)
  }
}

export interface Storage {
  name: string
  id: string
  location: StorageLocation
  storageClass: StorageClass
  locationType: StorageLocationType
  projectNumber: string
  createdAt: Date
  updatedAt: Date
  lifecycle: LifecycleRule[]
}

interface LifecycleRule {
  action: { type: string; storageClass?: string } | string
  condition: { [key: string]: boolean | Date | number | string }
  storageClass?: string
}

export type StorageLocation =
  | 'US'
  | 'EU'
  | 'ASIA'
  | 'NORTHAMERICA-NORTHEAST1'
  | 'EUR4'
  | 'NAM4'
  | 'US-CENTRAL1'
  | 'US-EAST1'
  | 'US-EAST4'
  | 'US-WEST1'
  | 'US-WEST2'
  | 'SOUTHAMERICA-EAST1'
  | 'EUROPE-NORTH1'
  | 'EUROPE-WEST1'
  | 'EUROPE-WEST2'
  | 'EUROPE-WEST3'
  | 'EUROPE-WEST4'
  | 'EUROPE-WEST6'
  | 'ASIA-EAST1'
  | 'ASIA-EAST2'
  | 'ASIA-NORTHEAST1'
  | 'ASIA-NORTHEAST2'
  | 'ASIA-SOUTH1'
  | 'ASIA-SOUTHEAST1'
  | 'AUSTRALIA-SOUTHEAST1'

export type StorageClass =
  | 'STANDARD'
  | 'NEARLINE' /* min 30 days */
  | 'COLDLINE' /* min 90 days */
  | 'MULTI-REGIONAL'
  | 'REGIONAL'
  | 'DURABLE_REDUCED_AVAILABILITY'

export type StorageLocationType = 'region' | 'dual-region' | 'multi-region'
