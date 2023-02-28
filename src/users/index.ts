import * as admin from 'firebase-admin'
import * as tools from 'firebase-tools'
import fs from 'fs'
import fetch from 'node-fetch'
import { tmpdir } from 'os'
import { parse, resolve } from 'path'
import { format } from 'url'
import { promisify } from 'util'
import { defaultControllerDomain } from '../options'
import asyncMiddleware from '../_lib/asyncMiddleware'
import operationResponse, { UsersStatusResponse } from '../_lib/operation'
import * as functions from 'firebase-functions'

const unlink = promisify(fs.unlink)

export interface UsersBackupOptions {
  bucketsAllowlist?: string[]
  projectId: string
  controllerDomain?: string
  controllerToken: string
  agentURL: string
}

export interface UsersBackupRequestBody {
  storageId: string
  path: string
  delay?: {
    backupId: string
    state: 'delay' | 'backup'
  }
}

export function backupUsersMiddleware({
  bucketsAllowlist,
  projectId,
  controllerDomain,
  controllerToken,
  agentURL,
}: UsersBackupOptions) {
  return asyncMiddleware(async (request, response) => {
    // TODO: Validate options
    const body = request.body as UsersBackupRequestBody

    functions.logger.info('Requested users backup', {
      // NOTE: Do not ...body here to avoid logging sensitive data
      storageId: body.storageId,
      path: body.path,
      backupId: body.delay?.backupId,
      state: body.delay?.state,
      bucketsAllowlist,
      projectId,
    })

    if (body.delay?.state === 'delay') {
      functions.logger.info('Delaying users backup')

      // NOTE: Trigger backup, but do not wait for the result
      fetch(agentURL + request.path, {
        method: 'POST',
        headers: {
          // Authorization can't be missing as we verify it
          Authorization: request.header('Authorization')!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storageId: body.storageId,
          path: body.path,
          delay: {
            state: 'backup',
            backupId: body.delay.backupId,
          },
        }),
      })

      functions.logger.info('Responding with pending status')

      operationResponse(response, { state: 'pending' })
    } else {
      functions.logger.info('Initiating users backup')

      const backupResponse = await backupUsers(projectId, body)

      functions.logger.info('Got the users backup response', {
        // NOTE: Do not ...body here to avoid logging sensitive data
        state: backupResponse.state,
        ...(backupResponse.state === 'pending'
          ? {}
          : backupResponse.state === 'completed'
          ? {
              usersCount: backupResponse.data.usersCount,
              size: backupResponse.data.size,
            }
          : {
              reason: backupResponse.data.reason,
            }),
      })

      if (body.delay) {
        const reportURL = format({
          hostname: controllerDomain || defaultControllerDomain,
          protocol: 'https',
          pathname: '/reportBackup',
        })

        functions.logger.info('Reporting users backup to the controller', {
          reportURL,
        })

        await fetch(reportURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: controllerToken,
            backupId: body.delay.backupId,
            type: 'users',
            ...backupResponse,
          }),
        })
      }

      functions.logger.info('Responding with the backup status')

      operationResponse(response, backupResponse)
    }
  })
}

async function backupUsers(
  projectId: string,
  options: UsersBackupRequestBody
): Promise<UsersStatusResponse> {
  // Create bucket
  const bucket = admin.storage().bucket(options.storageId)

  // Create temporary file path
  const path = tmpPath(options.path)

  functions.logger.info('Exporting users to a temporary file', { path })

  // Export users to a temporary file
  await tools.auth.export(path, { project: projectId })

  // Calculate users in the backup and
  // upload the users backup to the storage

  functions.logger.info(
    'Uploading users backup to the storage and counting the users'
  )

  const [usersCount, size] = await Promise.all([
    calculateUsers(path).then((count) => {
      functions.logger.info('Got the users count', { count })
      return count
    }),

    bucket
      .upload(path, { destination: options.path })
      .then(([file]) => file.metadata.size as string)
      .then((size) => {
        functions.logger.info('Uploaded the users backup to the storage', {
          size,
        })
        return size
      }),
  ])

  functions.logger.info('Removing the temporary file')

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
  let usersCount = 0
  let lookingForEnding: string | null = null

  for await (const chunk of generateFileChunks(path, 10000000 /* 10MB */)) {
    const text: string = chunk.toString()

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
 * Genenerates chunks of data from the given file.
 *
 * The code is based on the article by Kasper Moskwiak (https://github.com/kmoskwiak): https://betterprogramming.pub/a-memory-friendly-way-of-reading-files-in-node-js-a45ad0cc7bb6
 *
 * @param path - the file path to read
 * @param size - the chunk size
 */
async function* generateFileChunks(path: string, size: number) {
  const sharedBuffer = Buffer.alloc(size)
  const stats = fs.statSync(path)
  const file = fs.openSync(path, 'r')

  let bytesRead = 0 // How many bytes were read
  let end = size

  for (let chunk = 0; chunk < Math.ceil(stats.size / size); chunk++) {
    await readFileBytes(file, sharedBuffer)

    bytesRead = (chunk + 1) * size
    // When we reach the end of file, we have to calculate how many bytes were
    // actually read.
    if (bytesRead > stats.size) end = size - (bytesRead - stats.size)

    yield sharedBuffer.slice(0, end)
  }
}

/**
 * Reads the file bytes into the shared buffer.
 *
 * The code is based on the article by Kasper Moskwiak (https://github.com/kmoskwiak): https://betterprogramming.pub/a-memory-friendly-way-of-reading-files-in-node-js-a45ad0cc7bb6
 *
 * @param file - the file descriptor
 * @param buffer - the shared buffer to use
 * @returns promise to file read
 */
function readFileBytes(file: number, buffer: Buffer) {
  return new Promise((resolve, reject) => {
    fs.read(file, buffer, 0, buffer.length, null, (error) => {
      if (error) return reject(error)
      resolve(void 0)
    })
  })
}

/**
 * Generates temporary path on the FS from passed path in a bucket
 * @param path - The path to backup in a bucket
 */
function tmpPath(path: string) {
  const { base: fileName } = parse(path)
  return resolve(tmpdir(), fileName)
}
