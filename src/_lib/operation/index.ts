import { Response } from 'express'
import { OperationStatus } from '../../firestore/status'

export type FirestoreStatusResponse =
  | {
      state: 'completed'
      data: {
        usersCount: number | undefined
        size: string
      }
    }
  | {
      state: 'completed' | 'pending'
      data: { id: string; status: OperationStatus }
    }

export type UsersStatusResponse =
  | {
      state: 'completed' | 'pending'
      data: {
        usersCount: number | undefined
        size: string
      }
    }
  | {
      state: 'failed'
      data: {
        reason: string
      }
    }

export default function operationResponse(
  response: Response,
  payload: UsersStatusResponse | FirestoreStatusResponse
) {
  response.status(payload.state === 'failed' ? 400 : 200).send(payload)
}
