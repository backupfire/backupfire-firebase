import bodyParser from 'body-parser'
import express from 'express'
import jwt from 'express-jwt'
import * as functions from 'firebase-functions'
import {
  backupFirestoreMiddleware,
  checkFirestoreBackupStatusMiddleware
} from './firestore'
import { backupUsersMiddleware } from './users'

/**
 * Backup Fire agent options.
 */
export type BackupFireOptions = {
  accessToken: string
  sudoPassword: string
  bucketsWhitelist: string[]
}

/**
 * Creates Backup Fire Firebase Functions HTTPS handler.
 *
 * @param options - The Backup Fire agent options
 */
export default function backupFire(options: BackupFireOptions) {
  return functions.https.onRequest(createApp(options))
}

/**
 * Creates [Express] app that serves as an agent that provide API to
 * the Backup Fire controller.
 *
 * @param options - The Backup Fire agent options
 *
 * [Express]: https://expressjs.com/
 */
export function createApp(options: BackupFireOptions) {
  // Create Express app that would be mounted as a function
  const app = express()

  // Protect Backup Fire API with token authorization
  app.use(jwt({ secret: options.accessToken }))

  // Parse JSON body
  app.use(bodyParser.json())

  // Backup Firestore
  app.post(
    '/firestore',
    backupFirestoreMiddleware({ bucketsWhitelist: options.bucketsWhitelist })
  )
  // Check Firestore backup status
  app.get('/firestore/status', checkFirestoreBackupStatusMiddleware())

  // Backup Firebase users
  app.post(
    '/users',
    backupUsersMiddleware({ bucketsWhitelist: options.bucketsWhitelist })
  )

  return app
}
