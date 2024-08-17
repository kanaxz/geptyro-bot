const Queue = require('sools-core/types/Queue')

module.exports = {
  name: 'musicBot',
  dependencies: ['youtube', 'bot'],
  construct: async ({ youtube, bot }) => {
    const queue = new Queue()
    const musicChannel = bot.channels.cache.find(channel => channel.name === 'music-bot')

    const addMusic = (video, interaction) => {
      const music = {
        username: interaction.member.user.username,
        url: youtube.buildUrl(video.id),
        name: video.snippet.title,
        thumbnail: video.snippet.thumbnails.high.url,
        duration: video.contentDetails.duration.replace('PT', '').replace('M', ':').replace('S', '')
      }

      queue.push(music)
      return music
    }

    return {
      addMusic,
      queue,
      musicChannel,
    }
  }
}