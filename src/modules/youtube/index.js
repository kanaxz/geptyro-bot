import { youtube } from '@googleapis/youtube'
const YOUTUBE_URL = 'https://www.youtube.com'
const part = ['id', 'snippet', 'contentDetails']

export default {
  name: 'youtube',
  construct: ({ }, config) => {
    console.log(config.googleApiToken)
    const api = youtube({ version: 'v3', auth: config.googleApiToken })
    const buildUrl = (videoId) => `${YOUTUBE_URL}/watch?v=${videoId}`

    const getVideo = async (videoId) => {
      const { data: { items: [video] } } = await api.videos.list({
        part,
        id: videoId
      })
      return video
    }

    return {
      api,
      url: YOUTUBE_URL,
      buildUrl,
      getVideo,
      part,
    }
  }
}