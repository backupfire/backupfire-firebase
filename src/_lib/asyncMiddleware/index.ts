import express from 'express'

export default function asyncMiddleware(
  fn: express.RequestHandler
): express.RequestHandler {
  return (request, response, next) => {
    Promise.resolve(fn(request, response, next)).catch(next)
  }
}
