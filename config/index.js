const { join } = require('path')
const fs = require('fs')

const root = join(__dirname, '..')
module.exports = {
  root,
  mongo: {
    url: 'mongodb://geptyro-bot-database:27017/',
    db: 'geptyro-bot'
  },
  ...require('./private'),
}
