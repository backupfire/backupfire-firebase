import asyncMiddleware from '../_lib/asyncMiddleware'
import { Storage as CloudStorage, Bucket } from '@google-cloud/storage'

export interface StorageOptions {
  bucketsAllowlist?: string[]
}

export function storageListMiddleware({ bucketsAllowlist }: StorageOptions) {
  return asyncMiddleware(async (request, response) => {
    const storage = new CloudStorage()
    const [buckets] = await storage.getBuckets()
    const storageList: Storage[] = buckets.map(bucketAsStorage)
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
  const storage = new CloudStorage()

  return asyncMiddleware(async (request, response) => {
    const body = request.body as CreateStorageRequestBody

    const [bucket] = await storage.createBucket(body.storageId, {
      [body.storageClass || 'nearline']: true,
      location: body.location
    })

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
        await bucket.addLifecycleRule(
          {
            action: { type: 'Delete' },
            condition: { age: deleteAge }
          },
          { append: false }
        )
      } else {
        await bucket.setMetadata({ lifecycle: null })
      }
    }

    const [bucketData] = await bucket.get()
    response.send(bucketAsStorage(bucketData))
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
  adminPassword
}: PasswordedStorageOptions) {
  return asyncMiddleware(async (request, response) => {
    // TODO: Validate options
    const storageId = request.params.storageId as string

    const body = request.body as UpdateStorageRequestBody

    if (body.password !== adminPassword) {
      response.status(403).send({ friendlyMessage: 'Wrong admin password' })
      return
    }

    const storage = new CloudStorage()
    const bucket = storage.bucket(storageId)
    const deleteAge = keepBackupInDays(
      body.keepBackupsValue,
      body.keepBackupsUnit
    )

    if (body.removeOldBackups) {
      await bucket.addLifecycleRule(
        {
          action: { type: 'Delete' },
          condition: { age: deleteAge }
        },
        { append: false }
      )
    } else {
      await bucket.setMetadata({ lifecycle: null })
    }

    const [bucketData] = await bucket.get()
    response.send(bucketAsStorage(bucketData))
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
  const storage = new CloudStorage()

  return asyncMiddleware(async (request, response) => {
    const storageId = request.params.storageId as string
    const query = (request.query as unknown) as ListFilesRequestQuery

    const bucket = storage.bucket(storageId)
    const [files] = await bucket.getFiles({
      prefix: query.path,
      maxResults: query.maxResults ? parseInt(query.maxResults) : undefined,
      startOffset: query.startOffset,
      endOffset: query.endOffset,
      autoPaginate: !query.endOffset && !query.startOffset
    })

    const result = files.map(file => ({
      name: file.name,
      createdAt: file.metadata.timeCreated,
      updatedAt: file.metadata.updated,
      size: parseInt(file.metadata.size),
      contentType: file.metadata.contentType, // 'application/octet-stream'
      storageClass: file.metadata.storageClass, // 'STANDARD'
      storageClassUpdatedAt: new Date(file.metadata.timeStorageClassUpdated),
      etag: file.metadata.etag
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
      lifecycle
    }
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
    lifecycle: lifecycle && lifecycle.rule
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
