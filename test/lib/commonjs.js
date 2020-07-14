const assert = require('assert')
const backupfire = require('../../lib')

assert(
  typeof backupfire === 'function',
  "CommonJS require does't work as expected"
)
