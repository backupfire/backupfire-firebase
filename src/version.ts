import fs from 'fs'
import path from 'path'

let version = 'dev'
try {
  const packageStr = fs.readFileSync(
    path.resolve(__dirname, './package.json'),
    'utf8'
  )
  const packageJson = JSON.parse(packageStr)
  if (typeof packageJson.version === 'string')
    version = `v${packageJson.version}`
} catch (_err) {}

export default version
