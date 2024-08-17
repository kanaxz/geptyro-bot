const { join } = require('path')
const fs = require('fs')

const root = join(__dirname, '..')
module.exports = {
  root,
  mongo: {
    url: 'mongodb://127.0.0.1:27017/',
    db: 'geptyro-bot'
  },
  ...require('./private'),
}
