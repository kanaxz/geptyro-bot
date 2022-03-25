const { youtube } = require('@googleapis/youtube')

module.exports = ({ config }) => {
  const youtubeApi = youtube({ version: 'v3', auth: config.googleApiToken })
  return youtubeApi
}