const { parseCommand } = require('../../../utils/command')


module.exports = (self, { player, bot, playlist, youtube }) => {

  const musicsAdded = self.event('musicsAdded')
  const part = ['id', 'snippet', 'contentDetails']

  const searchAndAdd = async (videoId, author) => {
    const { data: { items: [video] } } = await youtube.videos.list({
      part,
      id: videoId
    })
    if (!video)
      return
    return addVideo(videoId, video, author)
  }

  const processPlayArgs = async (msg, query, handlePlaylist) => {
    const voiceChannel = msg.member.voice?.channel
    if (!voiceChannel)
      return
    if (query.startsWith(youtube.url)) {
      const url = new URL(query)

      const videoId = url.searchParams.get('v')
      if (!videoId) {
        return
      }
      if (!await searchAndAdd(videoId, msg.author))
        return
      const list = url.searchParams.get('list')
      if (handlePlaylist && list && list !== 'LL') {
        const result = await youtube.api.playlistItems.list({
          part,
          playlistId: list,
          maxResults: 6
        })
        result.data.items.shift()
        for (const video of result.data.items) {
          addVideo(video.snippet.resourceId.videoId, video, msg.author)
        }
      }
    } else {
      const { data: { items: [video] } } = await youtube.api.search.list({
        part: ['id'],
        maxResults: 1,
        type: ['video'],
        q: query
      })
      if (!video)
        return
      await searchAndAdd(video.id.videoId, msg.author)
    }
    musicsAdded()
    await player.joinChannel(voiceChannel)
    if (player.status === 'idle') {
      await player.playCurrent()
    }
  }

  const removeMusicAtIndex = self.event('removeMusicAtIndex', (index) => {
    if (typeof (index) === 'string')
      index = parseInt(index)
    if (isNaN(index))
      return
    playlist.removeAtIndex(index)
  })

  const commands = {
    play: async (msg, ...args) => {
      await processPlayArgs(msg, args.join(' '))
    },
    playlist: async (msg, ...args) => {
      await processPlayArgs(msg, args.join(' '), true)
    },
    volume: async (msg, volume) => {
      player.setVolume(volume)
      await msg.delete()
    },
    remove: async (msg, index) => {
      await removeMusicAtIndex(index)
    }
  }

  const addVideo = (id, video, author) => {
    if (!id || video.snippet.title === 'Deleted video')
      return
    const music = {
      username: author.username,
      url: youtube.buildUrl(id),
      name: video.snippet.title,
      thumbnail: video.snippet.thumbnails.high.url,
      duration: video.contentDetails.duration.replace('PT', '').replace('M', ':').replace('S', '')
    }
    playlist.push(music)
    return music
  }

  bot.on("messageCreate", async (msg) => {
    const command = parseCommand(bot, msg)
    if (!command) {
      return
    }

    if (commands[command.name]) {
      await commands[command.name](msg, ...command.args)
    }
  })
}