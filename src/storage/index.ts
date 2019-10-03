import asyncMiddleware from '../_lib/asyncMiddleware'
import { Storage as CloudStorage, Bucket } from '@google-cloud/storage'

export type StorageOptions = {
  bucketsWhitelist?: string[]
}

export function storageListMiddleware({ bucketsWhitelist }: StorageOptions) {
  return asyncMiddleware(async (request, response) => {
    const storage = new CloudStorage()
    const [buckets] = await storage.getBuckets()
    const storageList: Storage[] = buckets.map(bucketAsStorage)
    response.send(storageList)
  })
}

export function createStorageMiddleware({ bucketsWhitelist }: StorageOptions) {
  return asyncMiddleware(async (request, response) => {
    // TODO: Validate options

    // await backupUsers(options)

    response.send([])
  })
}

type UpdateStorageRequestBody = {
  password: string
  removeOldBackups: boolean
  keepBackupsValue: number
  keepBackupsUnit: KeepBackupsUnit
}

type KeepBackupsUnit = 'years' | 'months' | 'days'

export function updateStorageMiddleware({ bucketsWhitelist }: StorageOptions) {
  return asyncMiddleware(async (request, response) => {
    // TODO: Validate options
    const storageId = request.params.storageId as string

    const body = request.body as UpdateStorageRequestBody
    // TODO: Check password

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

export type Storage = {
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

type LifecycleRule = {
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
