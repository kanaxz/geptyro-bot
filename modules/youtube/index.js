const { youtube } = require('@googleapis/youtube')

module.exports = (self, { config }) => {
  return youtube({ version: 'v3', auth: config.googleApiToken })
}