import { Response } from 'express'

export type BackupOperationResponse<OperationData> = {
  state: 'completed' | 'pending' | 'failed'
  data: OperationData
}

export default function operationSuccess<OperationData>(
  response: Response,
  payload: BackupOperationResponse<OperationData>
) {
  response.status(payload.state === 'failed' ? 400 : 200).send(payload)
}
