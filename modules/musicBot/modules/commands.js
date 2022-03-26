const ytdl = require('ytdl-core-discord')

const { joinVoiceChannel, createAudioPlayer, getVoiceConnection, createAudioResource, } = require('@discordjs/voice')
const { parseCommand } = require('../../../utils/command')

const YOUTUBE_URL = 'https://www.youtube.com'


module.exports = (self, { musicBot, bot, playlist, youtube }) => {
  const audioPlayer = createAudioPlayer()
  let audioResource
  const state = musicBot.state
  self.isMute = false
  let startDate
  let pauseDate
  let pauseTime = 0
  self.duration = 0

  state.setDefault({ volume: 0.5, repeat: false })

  const playCurrent = self.event('playCurrent', async () => {
    const music = playlist.current()
    if (!music) {
      return
    }
    console.log("playing", music)
    const stream = await ytdl(music.url, { filter: 'audioonly', highWaterMark: 1 << 25 });
    audioResource = createAudioResource(stream, { inlineVolume: true })
    audioResource.volume.setVolume(state.volume)
    audioPlayer.play(audioResource)
    startDate = new Date()
    pauseDate = null
    pauseTime = 0
    self.duration = 0
    return music
  })

  self.getter('status', () => audioPlayer.state.status)
  const currentEnded = self.event('currentEnded', playlist.pop)
  audioPlayer.on('idle', currentEnded)
  playlist.before('change', playCurrent)

  self.stop = self.event('stop', async () => {
    playlist.reset()
    if (self.voiceConnection) {
      self.voiceConnection.disconnect()
      self.voiceConnection.destroy()
      self.voiceConnection = null
    }
    audioPlayer.stop(true)
  })

  self.setVolume = self.event('setVolume', (volume) => {
    if (typeof (volume) === 'string') {
      volume = parseFloat(volume)
    }
    if (volume > 5)
      volume = 5

    audioResource.volume.setVolume(volume)
    state.volume = volume
    state.save()
  })

  self.updateDuration = self.event('updateDuration', (duration) => {
    self.duration = Math.floor(((pauseDate || new Date()) - startDate - pauseTime) / 1000)
  })

  setInterval(self.updateDuration, 1000 * 10)

  self.setPause = self.event('setPause', (isPaused) => {
    if (isPaused)
      pauseDate = new Date()
    else {
      pauseTime += new Date() - pauseDate
      pauseDate = null
    }
    audioPlayer[isPaused && 'pause' || 'unpause']()
  })

  self.setRepeat = self.event('setRepeat', (repeat) => {
    state.repeat = repeat
    state.save()
  })

  self.setMute = self.event('setMute', (isMute) => {
    self.isMute = isMute
    audioResource.volume.setVolume(!self.isMute && state.volume || 0)
  })

  const musicsAdded = self.event('musicsAdded')

  const joinChannel = async (voiceChannel) => {
    if (self.voiceConnection) {
      if (self.voiceConnection.joinConfig.channelId === voiceChannel.id) {
        return
      }
      await stop()
    }

    self.voiceConnection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    })

    self.voiceConnection.subscribe(audioPlayer)
  }

  const part = ['id', 'snippet', 'contentDetails']


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
        part,
        id: videoId
      })
      if (!video)
        return
      addVideo(videoId, video, msg.author)
      console.log(video)
      const list = url.searchParams.get('list')
      if (handlePlaylist && list && list !== 'LL') {
        const result = await youtube.playlistItems.list({
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
      const { data: { items: [video] } } = await youtube.search.list({
        part,
        maxResults: 1,
        type: ['video'],
        q: query
      })
      if (!video)
        return
      addVideo(video.id.videoId, video, msg.author)
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
    },
    volume: async (msg, volume) => {
      self.setVolume(volume)
      await msg.delete()
    }
  }

  const addVideo = (id, video, author) => {
    if (!id || video.snippet.title === 'Deleted video')
      return
    playlist.push({
      username: author.username,
      url: `${YOUTUBE_URL}/watch?v=${id}`,
      name: video.snippet.title,
      thumbnail: video.snippet.thumbnails.high.url,
      duration: video.contentDetails.duration.replace('PT', '').replace('M', ':').replace('S', '')
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