import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import { expressjwt as jwt } from 'express-jwt'
import * as functions from 'firebase-functions'
import fetch from 'node-fetch'
import { format } from 'url'
import {
  backupFirestoreMiddleware,
  checkFirestoreBackupStatusMiddleware,
  getCollectionsMiddleware,
} from './firestore'
import {
  defaultControllerDomain,
  defaultMemory,
  defaultRegion,
  defaultTimeout,
} from './options'
import {
  createStorageMiddleware,
  listFilesMiddleware,
  storageListMiddleware,
  updateStorageMiddleware,
} from './storage'
import {
  AgentOptions,
  BackupFireEnvConfig,
  BackupFireHTTPSHandler,
  BackupFireOptions,
  RuntimeEnvironment,
} from './types'
import { backupUsersMiddleware } from './users'
import version from './version'
import {
  configureExceptionsScope,
  createCrashedApp,
  exceptionHandlerMiddleware,
  initExceptionsTracker,
} from './_lib/exceptions'

export enum BackupFireConfig {
  Token = 'BACKUPFIRE_TOKEN',
  Password = 'BACKUPFIRE_PASSWORD',
  Domain = 'BACKUPFIRE_DOMAIN',
  Allowlist = 'BACKUPFIRE_ALLOWLIST',
}

// Fallback for CommonJS
module.exports = backupFire

/**
 * Creates Backup Fire Firebase Functions HTTPS handler.
 *
 * @param options - The Backup Fire agent options
 */
export default function backupFire(agentOptions?: AgentOptions) {
  initExceptionsTracker()

  try {
    // Use dummy handler if it's emulator or not deployed to Functions
    if (isEmulator() || !isDeployedToFunctions())
      return dummyHandler({
        region: agentOptions?.region,
        memory: agentOptions?.memory,
        timeout: agentOptions?.timeout,
      })

    // Derive Backup Fire options from environment configuration
    const envConfig = getEnvConfig()

    // If options aren't set, use  dummy handler instead
    if (!envConfig) {
      console.warn(
        `Warning: the Backup Fire configuration is missing, either set BACKUPFIRE_TOKEN and BACKUPFIRE_PASSWORD or set backupfire.token and backupfire.password as env config values. Running a dummy HTTP handler instead of the Backup Fire agent...`
      )
      return dummyHandler({ region: agentOptions?.region })
    }

    const options: BackupFireOptions = Object.assign(
      {
        controllerDomain: envConfig.domain,
        controllerToken: envConfig.token,
        adminPassword: envConfig.password,
        bucketsAllowlist: envConfig.allowlist?.split(','),
        debug: envConfig.debug === 'true',
      },
      agentOptions
    )

    // Get runtime environment (Firebase project ID, region, etc)

    const runtimeEnv = getRuntimeEnv(options)

    // If the function name isn't backupfire, use dummy handler
    if (runtimeEnv.functionName !== 'backupfire') {
      if (options.debug)
        console.log(
          `The function name isn't "backupfire" (${runtimeEnv.functionName}). Running a dummy HTTP handler instead of the Backup Fire agent...`
        )
      return dummyHandler(options)
    }

    // If some of the variables are missing, use dummy handler
    if (!isCompleteRuntimeEnv(runtimeEnv)) {
      console.warn(
        'Warning: runtime environment is incomplete:',
        prettyJSON(runtimeEnv)
      )
      console.warn(
        'Running a dummy HTTP handler instead of the Backup Fire agent...'
      )
      return dummyHandler(options)
    }

    // Set additional context
    configureExceptionsScope((scope) => {
      scope.setUser({ id: envConfig.token })
      scope.setTag('project_id', runtimeEnv.projectId)
      scope.setTag('node_version', process.version)
    })

    if (options.debug) {
      console.log(
        'Initializing Backup Fire agent with options:',
        prettyJSON(options)
      )
      console.log('Runtime environment:', prettyJSON(runtimeEnv))
    }

    // Send the initialization ping to the controller
    sendInitializationPing(options, runtimeEnv)

    return httpsHandler({
      handler: createApp(runtimeEnv, options),
      agentOptions,
      runtimeEnv,
    })
  } catch (err) {
    return httpsHandler({
      handler: createCrashedApp(err),
      agentOptions,
    })
  }
}

/**
 * Creates [Express] app that serves as an agent that provide API to
 * the Backup Fire controller.
 *
 * @param runtimeEnv - The runtime environment variables
 * @param options - The Backup Fire agent options
 *
 * [Express]: https://expressjs.com/
 */
export function createApp(
  runtimeEnv: RuntimeEnvironment,
  options: BackupFireOptions
): BackupFireHTTPSHandler {
  // Create Express app that would be mounted as a function
  const app = express()

  // Protect Backup Fire API with token authorization
  app.use(jwt({ secret: options.controllerToken, algorithms: ['HS256'] }))

  // Parse JSON body
  app.use(bodyParser.json())

  // Allow requests from web
  app.use(cors({ origin: true }))

  const globalOptions = { bucketsAllowlist: options.bucketsAllowlist }

  // Backup Firestore
  app.post(
    '/firestore',
    backupFirestoreMiddleware({
      projectId: runtimeEnv.projectId,
      ...globalOptions,
    })
  )
  // Check Firestore backup status
  app.get('/firestore/status', checkFirestoreBackupStatusMiddleware())

  // List collections
  app.get('/firestore/collections', getCollectionsMiddleware())

  // Backup Firebase users
  app.post(
    '/users',
    backupUsersMiddleware({
      projectId: runtimeEnv.projectId,
      controllerToken: options.controllerToken,
      controllerDomain: options.controllerDomain,
      agentURL: agentURL(runtimeEnv),
      ...globalOptions,
    })
  )

  // List storage
  app.get('/storage', storageListMiddleware(globalOptions))
  // Create storage
  app.post('/storage', createStorageMiddleware(globalOptions))
  // Update storage
  app.put(
    '/storage/:storageId',
    updateStorageMiddleware({
      adminPassword: options.adminPassword,
      ...globalOptions,
    })
  )
  // List files in the storage
  app.get('/storage/:storageId/files', listFilesMiddleware(globalOptions))

  app.use(exceptionHandlerMiddleware)

  return app
}

interface HTTPSHandlerProps {
  handler: BackupFireHTTPSHandler
  agentOptions: AgentOptions | undefined
  runtimeEnv?: RuntimeEnvironment
}

function httpsHandler({
  handler,
  agentOptions,
  runtimeEnv,
}: HTTPSHandlerProps) {
  if (runtimeEnv?.extensionId) {
    return functions.https.onRequest(handler)
  } else {
    return functions
      .runWith({
        ...getRuntimeOptions(agentOptions),
        secrets: Object.values(BackupFireConfig),
        // Sometimes Firebase Functions doesn't set the invoker correctly:
        // See: https://github.com/firebase/firebase-tools/issues/3965#issuecomment-1006005316
        invoker: 'public',
      })
      .region(agentOptions?.region || defaultRegion)
      .https.onRequest(handler)
  }
}

function sendInitializationPing(
  options: BackupFireOptions,
  runtimeEnv: RuntimeEnvironment
) {
  // TODO: Report failure if the request fails
  const pingURL = format({
    hostname: options.controllerDomain || defaultControllerDomain,
    protocol: 'https',
    pathname: '/ping',
    query: {
      agentVersion: version,
      nodeVersion: process.version,
      region: runtimeEnv.region,
      token: options.controllerToken,
      projectId: runtimeEnv.projectId,
      runtime: runtimeEnv.region,
      agentURL: agentURL(runtimeEnv),
    },
  })
  return fetch(pingURL)
}

function agentURL(runtimeEnv: RuntimeEnvironment) {
  const { region, projectId, functionName, extensionId } = runtimeEnv
  return `https://${region}-${projectId}.cloudfunctions.net/${
    extensionId ? `ext-${extensionId}-${functionName}` : functionName
  }`
}

function isEmulator() {
  return process.env.FUNCTIONS_EMULATOR === 'true'
}

function isDeployedToFunctions() {
  // Detect if the agent is deployed to Firebase Functions
  // See: https://cloud.google.com/functions/docs/env-var#environment_variables_set_automatically
  return !!process.env.FUNCTION_NAME || !!process.env.FUNCTION_TARGET
}

function getRuntimeEnv(
  options: BackupFireOptions
): Partial<RuntimeEnvironment> | RuntimeEnvironment {
  const extensionId = process.env.EXT_INSTANCE_ID

  return {
    region: extensionId
      ? process.env.LOCATION
      : options.region || defaultRegion,
    // Node.js v8 runtime sets GCP_PROJECT, while v10 uses depricated GCLOUD_PROJECT
    projectId: process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT,
    // Node.js v8 runtime uses FUNCTION_NAME, v10 — FUNCTION_TARGET
    // See: https://cloud.google.com/functions/docs/env-var#environment_variables_set_automatically
    functionName: process.env.FUNCTION_NAME || process.env.FUNCTION_TARGET,
    extensionId,
  }
}

function getEnvConfig(): BackupFireEnvConfig | undefined {
  const token = process.env[BackupFireConfig.Token]
  const password = process.env[BackupFireConfig.Password]
  const domain = process.env[BackupFireConfig.Domain]
  const allowlist = process.env[BackupFireConfig.Allowlist]

  const envConfig = functions.config().backupfire as
    | BackupFireEnvConfig
    | undefined

  // First, check if the env contains the token & password
  if (token && password) return { token, password, domain, allowlist }
  // Otherwise, return the env config value
  else envConfig
}

function isCompleteRuntimeEnv(
  runtimeEnv: Partial<RuntimeEnvironment> | RuntimeEnvironment
): runtimeEnv is RuntimeEnvironment {
  return (
    !!runtimeEnv.functionName && !!runtimeEnv.projectId && !!runtimeEnv.region
  )
}

function dummyHandler(
  options: Pick<BackupFireOptions, 'region' | 'memory' | 'timeout'>
) {
  const runtimeOptions: functions.RuntimeOptions = {}
  if (options?.memory) runtimeOptions.memory = options.memory
  if (options?.timeout) runtimeOptions.timeoutSeconds = options.timeout

  return functions
    .runWith(getRuntimeOptions(options))
    .region(options.region || defaultRegion)
    .https.onRequest((_req, resp) => {
      resp.end()
    })
}

function prettyJSON(obj: any) {
  return JSON.stringify(obj, null, 2)
}

/**
 *
 * @param agentOptions - TODO
 * @returns
 */
function getRuntimeOptions(
  agentOptions: AgentOptions | undefined
): functions.RuntimeOptions {
  const options: functions.RuntimeOptions = {
    // Always assign timeout and memory to runtime options. Unless the user
    // defines custom values, we want to use the default timeout of 9 minutes
    // and 1Gb memory to make sure the user backups are completed regardless
    // of how many there are.
    timeoutSeconds: agentOptions?.timeout || defaultTimeout,
    memory: agentOptions?.memory || defaultMemory,
  }

  if (agentOptions?.memory) options.memory = agentOptions.memory

  return options
}
