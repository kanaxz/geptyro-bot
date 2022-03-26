const { youtube } = require('@googleapis/youtube')

module.exports = ({ config }) => {
  return youtube({ version: 'v3', auth: config.googleApiToken })
}