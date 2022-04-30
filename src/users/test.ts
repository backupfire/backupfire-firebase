import { writeFile } from 'fs/promises'
import { fs } from 'mz'
import { tmpdir } from 'os'
import { resolve } from 'path'
import { calculateUsers, calculateUsersInSteam } from '.'

describe('users', () => {
  describe('calculateUsers', () => {
    let backupPath: string
    beforeEach(() => {
      backupPath = resolve(tmpdir(), Date.now() + '.json')
      return writeFile(
        backupPath,
        JSON.stringify([{ localId: 1 }, { localId: 2 }, { localId: 3 }])
      )
    })

    it('calculates the number of users in the backup', async () => {
      const result = await calculateUsers(backupPath)
      expect(result).toBe(3)
    })
  })

  describe('calculateUsersInSteam', () => {
    it('calculates the number of users in the stream', async () => {
      const stream = ([
        '[{"localId":1},{',
        '"localId":2},{"localId":3}]'
      ] as unknown) as fs.ReadStream
      const result = await calculateUsersInSteam(stream)
      expect(result).toBe(3)
    })

    it('considers chunks split', async () => {
      const stream = ([
        '[{"localId":1},{',
        '"loca',
        'lId":2},{"localId":3}]'
      ] as unknown) as fs.ReadStream
      const result = await calculateUsersInSteam(stream)
      expect(result).toBe(3)
    })

    it('skips incomplete symbols when calculating split', async () => {
      const stream = ([
        '[{"localId":1},{',
        '"loca',
        // It must be 'lId":2},{"localId":3}]'
        // to calculate split
        'Id":2},{"localId":3}]'
      ] as unknown) as fs.ReadStream
      const result = await calculateUsersInSteam(stream)
      expect(result).toBe(2)
    })
  })
})
