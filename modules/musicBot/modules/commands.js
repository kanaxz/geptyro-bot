const ytdl = require('ytdl-core-discord')

const { joinVoiceChannel, createAudioPlayer, getVoiceConnection, createAudioResource, } = require('@discordjs/voice')
const { parseCommand } = require('../../../utils/command')

const YOUTUBE_URL = 'https://www.youtube.com'


module.exports = (self, { bot, playlist, youtube }) => {
  let voiceConnection
  const audioPlayer = createAudioPlayer()

  const playCurrent = self.event('playCurrent', async () => {
    const music = playlist.current()
    if (!music) {
      return
    }
    console.log("playing", music)
    const stream = await ytdl(music.url, { filter: 'audioonly', highWaterMark: 1 << 25 });
    const audioResource = createAudioResource(stream, { inlineVolume: true })
    audioPlayer.play(audioResource)
    return music
  })



  self.getter('status', () => audioPlayer.state.status)
  self.pause = () => audioPlayer.pause()
  self.unpause = () => audioPlayer.unpause()
  const currentEnded = self.event('currentEnded', playlist.pop)
  audioPlayer.on('idle', currentEnded)
  playlist.before('change', playCurrent)

  self.stop = self.event('stop', async () => {
    playlist.reset()
    if (voiceConnection) {
      voiceConnection.disconnect()
      voiceConnection.destroy()
      voiceConnection = null
    }
  })

  const musicsAdded = self.event('musicAdded')

  const joinChannel = async (voiceChannel) => {
    if (voiceConnection) {
      if (voiceConnection.joinConfig.channelId === voiceChannel.id) {
        return
      }
      await stop()
    }

    voiceConnection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    })

    voiceConnection.subscribe(audioPlayer)
  }



  const processPlayArgs = async (msg, query, handlePlaylist) => {
    const voiceChannel = msg.member.voice?.channel
    if (!voiceChannel)
      return
    if (query.startsWith(YOUTUBE_URL)) {
      const url = new URL(query)

      const videoId = url.searchParams.get('v')
      if (!videoId) {
        return
      }
      const { data: { items: [video] } } = await youtube.videos.list({
        part: ['id', 'snippet'],
        id: videoId
      })
      if (!video)
        return
      addVideo({ id: videoId, title: video.snippet.title }, msg.author)

      const list = url.searchParams.get('list')
      if (handlePlaylist && list && list !== 'LL') {
        const result = await youtube.playlistItems.list({
          part: ['id', 'snippet'],
          playlistId: list,
          maxResults: 6
        })
        result.data.items.shift()
        for (const video of result.data.items) {
          addVideo({ title: video.snippet.title, id: video.snippet.resourceId.videoId }, msg.author)
        }
      }
    } else {
      const { data: { items: [video] } } = await youtube.search.list({
        part: ['id', 'snippet'],
        maxResults: 1,
        type: ['video'],
        q: query
      })
      if (!video)
        return
      addVideo({ id: video.id.videoId, title: video.snippet.title }, msg.author)
    }
    musicsAdded()
    await joinChannel(voiceChannel)
    if (self.status === 'idle') {
      await playCurrent()
    }
  }

  const commands = {
    play: async (msg, ...args) => {
      await processPlayArgs(msg, ...args)
    },
    playlist: async (msg, ...args) => {
      await processPlayArgs(msg, ...args, true)
    }
  }

  const addVideo = (video, author) => {
    if (!video || video.title === 'Deleted video')
      return

    playlist.push({
      username: author.username,
      url: `${YOUTUBE_URL}/watch?v=${video.id}`,
      name: video.title
    })
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