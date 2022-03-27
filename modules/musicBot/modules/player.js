const ytdl = require('ytdl-core-discord')
const { joinVoiceChannel, createAudioPlayer, getVoiceConnection, createAudioResource, } = require('@discordjs/voice')
const Timer = require('../Timer')

module.exports = (self, { musicBot, bot, playlist, youtube }) => {
  const audioPlayer = createAudioPlayer()
  const state = musicBot.state
  let audioResource
  self.timer = new Timer()
  self.duration = 0
  self.isMute = false

  state.setDefault({ volume: 0.5, repeat: false })

  const currentEnded = self.event('currentEnded', playlist.pop)
  const changed = self.event('changed', state.save)

  self.getter('status', () => audioPlayer.state.status)

  audioPlayer.on('idle', currentEnded)
  playlist.before('change', self.playCurrent)

  self.joinChannel = async (voiceChannel) => {
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

  self.playCurrent = self.event('playCurrent', async () => {
    const music = playlist.current()
    //audioPlayer.stop(true)
    if (!music) {
      return
    }
    console.log("playing", music)
    const stream = await ytdl(music.url, { filter: 'audioonly', highWaterMark: 1 << 25 })
    audioResource = createAudioResource(stream, { inlineVolume: true })
    audioResource.volume.setVolume(state.volume)
    audioPlayer.play(audioResource)
    self.timer.start()
    return music
  })

  self.stop = self.event('stop', async () => {
    playlist.reset()
    if (self.voiceConnection) {
      self.voiceConnection.disconnect()
      self.voiceConnection.destroy()
      self.voiceConnection = null
    }
    audioPlayer.stop(true)
  })

  self.setVolume = (volume) => {
    if (typeof (volume) === 'string') {
      volume = parseFloat(volume)
    }
    if (volume < 0 || isNaN(volume)) return
    if (volume > 5)
      volume = 5

    audioResource.volume.setVolume(volume)
    state.volume = volume
    changed()
  }

  self.setPause = (isPaused) => {
    if (isPaused)
      self.timer.pause()
    else {
      self.timer.resume()
    }
    audioPlayer[isPaused && 'pause' || 'unpause']()
    changed()
  }

  self.setRepeat = (repeat) => {
    state.repeat = repeat
    changed()
  }

  self.setMute = (isMute) => {
    self.isMute = isMute
    audioResource.volume.setVolume(!self.isMute && state.volume || 0)
    changed()
  }
}