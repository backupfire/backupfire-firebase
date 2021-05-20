export type Region = typeof import('firebase-functions').region extends (
  region: infer RegionType
) => any
  ? RegionType
  : never

export type Memory = typeof import('firebase-functions').VALID_MEMORY_OPTIONS[number]

/**
 * Backup Fire agent options.
 */
export interface BackupFireOptions {
  /**
   * The Google Cloud region id where to deploy the Firebase function.
   */
  region?: Region

  /**
   * The agent function memory limit, defaults to "256MB".
   */
  memory?: Memory

  /**
   * The agent function timeout in seconds, defaults to 60.
   */
  timeout?: number

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
  bucketsAllowlist?: string[]

  /**
   * Make the agent print debug messages to the log.
   */
  debug?: boolean
}

// TODO: Split options definition to the ones coming from the environment config
// and the user-defined agent options.
export type AgentOptions = Pick<
  BackupFireOptions,
  'region' | 'controllerDomain' | 'debug' | 'memory' | 'timeout'
>

export interface BackupFireEnvConfig {
  domain?: string
  token: string
  password: string
  allowlist?: string
  debug?: string
}

export interface RuntimeEnvironment {
  region: string
  projectId: string
  functionName: string
  extensionId: string | undefined
  runtime: string | undefined
}

export type BackupFireHTTPSHandler = (
  request: import('firebase-functions').Request,
  response: import('firebase-functions').Response
) => any
