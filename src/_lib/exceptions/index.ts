import { NodeClient, Hub, Integrations } from '@sentry/node'
import { ErrorRequestHandler, response } from 'express'
import * as functions from 'firebase-functions'
import version from '../../version'

let client: NodeClient
let hub: Hub

export function initExceptionsTracker() {
  client = new NodeClient({
    dsn: 'https://18820ae312bc46c4af3b672248d8a361@sentry.io/1819926',
    release: version,
    integrations: [new Integrations.FunctionToString()],
    defaultIntegrations: false
  })
  hub = new Hub(client)
}

export const captureException: Hub['captureException'] = (...args) =>
  hub?.captureException(...args)

export const configureExceptionsScope: Hub['configureScope'] = (...args) =>
  hub?.configureScope(...args)

export const flushExceptions: NodeClient['flush'] = (...args) =>
  client?.flush(...args)

export const exceptionHandlerMiddleware: ErrorRequestHandler = (
  err,
  request,
  _response,
  next
) => {
  configureExceptionsScope(scope => {
    scope.setUser({ ip_address: request.ip })
    scope.setContext('request', request)
  })
  captureException(err)
  next(err)
}

export function createCrashedApp(err: any) {
  return (_request: functions.Request, response: functions.Response) => {
    const eventId = captureException(err)
    response.status(500).send({
      message: `The Backup Fire agent has failed to initialiaze (see event ${eventId})`
    })
  }
}
