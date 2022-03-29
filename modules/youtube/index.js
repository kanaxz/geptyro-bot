const { youtube } = require('@googleapis/youtube')
const YOUTUBE_URL = 'https://www.youtube.com'

module.exports = ({ config }) => {
  const api = youtube({ version: 'v3', auth: config.googleApiToken })
  const buildUrl = (videoId) => `${YOUTUBE_URL}/watch?v=${videoId}`
  return {
    api,
    url: YOUTUBE_URL,
    buildUrl,
  }
}