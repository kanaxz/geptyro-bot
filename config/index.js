const { join } = require('path')

const root = join(__dirname, '..')
module.exports = {
  root,
  ...require('./private'),
}
