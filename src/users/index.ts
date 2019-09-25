import * as tools from 'firebase-tools'
import * as admin from 'firebase-admin'
import { tmpdir } from 'os'
import { resolve, parse } from 'path'
import { unlink } from 'mz/fs'
import operationSuccess from '../_lib/operationSuccess'
import asyncMiddleware from '../_lib/asyncMiddleware'

export type UsersBackupOptions = {
  bucketsWhitelist?: string[]
}

export type UsersBackupRequestOptions = {
  bucket: string
  path: string
}

export function backupUsersMiddleware({
  bucketsWhitelist
}: UsersBackupOptions) {
  return asyncMiddleware(async (request, response) => {
    // TODO: Validate options
    const options = request.body as UsersBackupRequestOptions

    await backupUsers(options)

    operationSuccess(response, { state: 'completed', data: {} })
  })
}

async function backupUsers(options: UsersBackupRequestOptions) {
  // Create bucket
  const bucket = admin.storage().bucket(options.bucket)

  // Create temporary file path
  const path = tmpPath(options.path)

  // Export users to a temporary file
  await tools.auth.export(path, {
    project: process.env.GCP_PROJECT as string
  })

  // Upload the users to specified bucket
  await bucket.upload(path, { destination: options.path })

  // Remove the temporary file
  return unlink(path)
}

/**
 * Generates temporary path on the FS from passed path in a bucket
 * @param path - The path to backup in a bucket
 */
function tmpPath(path: string) {
  const { base: fileName } = parse(path)
  return resolve(tmpdir(), fileName)
}
