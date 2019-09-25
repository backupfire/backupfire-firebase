import bodyParser from 'body-parser'
import express from 'express'
import jwt from 'express-jwt'
import * as functions from 'firebase-functions'
import {
  backupFirestoreMiddleware,
  checkFirestoreBackupStatusMiddleware
} from './firestore'
import { backupUsersMiddleware } from './users'
import fetch from 'node-fetch'
import { format } from 'url'

export const defaultControllerDomain = 'backupfire.dev'

/**
 * Backup Fire agent options.
 */
export type BackupFireOptions = {
  /**
   * The controller app domain, defaults to backupfire.dev.
   */
  controllerDomain?: string

  /**
   * The controller access token that allows to securely communicate with
   * the controller.
   */
  controllerToken: string

  /**
   * The admin password which protects the agent from unauthorized commands
   * from the controller.
   */
  adminPassword: string

  /**
   * The list of buckets where the data can be backed up. It protects the agent
   * from malformed backup commands from the controller.
   */
  bucketsWhitelist?: string[]
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
  // Send the initialization ping to the controller
  sendInitializationPing(options)

  // Create Express app that would be mounted as a function
  const app = express()

  // Protect Backup Fire API with token authorization
  app.use(jwt({ secret: options.controllerToken }))

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

function sendInitializationPing(options: BackupFireOptions) {
  // TODO: Report failure if the request fails
  // TODO: Report failure if any of environment varibales are missing
  const pingURL = format({
    hostname: options.controllerDomain || defaultControllerDomain,
    protocol: 'https',
    pathname: '/ping',
    query: {
      token: options.controllerToken,
      projectId: process.env.GCP_PROJECT,
      functionURL: functionURL()
    }
  })
  return fetch(pingURL)
}

function functionURL() {
  const region = process.env.FUNCTION_REGION
  const projecId = process.env.GCP_PROJECT
  const functionName = process.env.FUNCTION_NAME
  return `https://${region}-${projecId}.cloudfunctions.net/${functionName}`
}
