import * as tools from 'firebase-tools'
import * as admin from 'firebase-admin'
import { tmpdir } from 'os'
import { resolve, parse } from 'path'
import operationResponse, { UsersStatusResponse } from '../_lib/operation'
import asyncMiddleware from '../_lib/asyncMiddleware'
import { promisify } from 'util'
import fs from 'fs'

const unlink = promisify(fs.unlink)

export type UsersBackupOptions = {
  bucketsAllowlist?: string[]
  projectId: string
}

export type UsersBackupRequestOptions = {
  storageId: string
  path: string
}

export function backupUsersMiddleware({
  bucketsAllowlist,
  projectId
}: UsersBackupOptions) {
  return asyncMiddleware(async (request, response) => {
    // TODO: Validate options
    const options = request.body as UsersBackupRequestOptions
    const state = await backupUsers(projectId, options)
    operationResponse(response, state)
  })
}

async function backupUsers(
  projectId: string,
  options: UsersBackupRequestOptions
): Promise<UsersStatusResponse> {
  // Create bucket
  const bucket = admin.storage().bucket(options.storageId)

  // Create temporary file path
  const path = tmpPath(options.path)

  // Export users to a temporary file
  await tools.auth.export(path, { project: projectId })

  // Calculate users in the backup and
  // upload the users backup to the storage

  const [usersCount, size] = await Promise.all([
    calculateUsers(path),
    bucket
      .upload(path, { destination: options.path })
      .then(([file]) => file.metadata.size as string)
  ])

  // Remove the temporary file
  await unlink(path)

  return { state: 'completed', data: { usersCount, size } }
}

/**
 * Calculates the number of users in the backup.
 * @param path - the backup path
 * @returns the number of users in the backup
 */
export async function calculateUsers(path: string) {
  const usersStream = fs.createReadStream(path, {
    encoding: 'utf8',
    highWaterMark: 10000000 // 10MB
  })

  return calculateUsersInSteam(usersStream)
}

/**
 * Calculates the number of users in the file stream.
 * @param usersStream - the backup file stream
 * @returns the number of users in the stream
 */
export async function calculateUsersInSteam(usersStream: fs.ReadStream) {
  let usersCount = 0
  let lookingForEnding: string | null = null

  for await (const data of usersStream) {
    const text: string = data.toString()

    if (lookingForEnding) {
      if (text.slice(0, lookingForEnding.length) === lookingForEnding)
        usersCount++
      lookingForEnding = null
    }

    usersCount += text.match(/"localId"/g)?.length || 0

    const ending = text.match(/"(l(o(c(a(l(I(d(")?)?)?)?)?)?)?)?$/)
    if (ending) lookingForEnding = '"localId"'.slice(ending[0].length)
  }

  return usersCount
}

/**
 * Generates temporary path on the FS from passed path in a bucket
 * @param path - The path to backup in a bucket
 */
function tmpPath(path: string) {
  const { base: fileName } = parse(path)
  return resolve(tmpdir(), fileName)
}
