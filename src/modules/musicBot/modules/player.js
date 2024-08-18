const ytdl = require('@distube/ytdl-core')
const { joinVoiceChannel, createAudioPlayer, getVoiceConnection, createAudioResource, } = require('@discordjs/voice')
const Timer = require('../Timer')
const Event = require('sools-core/types/Event')

module.exports = {
  dependencies: ['musicBot'],
  construct: ({ musicBot: { queue } }) => {
    const audioPlayer = createAudioPlayer()
    const timer = new Timer()
    let audioResource
    let voiceConnection
    let currentMusic

    const onCurrentEnded = new Event()

    const currentEnded = () => {
      const current = queue.removeCurrent()
      onCurrentEnded.trigger(current)
    }

    const stop = async () => {
      if (voiceConnection) {
        voiceConnection.disconnect()
        voiceConnection.destroy()
        voiceConnection = null
      }
      audioPlayer.stop(true)
    }

    const joinChannel = async (voiceChannel) => {
      if (voiceConnection && voiceConnection.joinConfig.channelId === voiceChannel.id) {
        return
      }

      voiceConnection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      })

      voiceConnection.subscribe(audioPlayer)
    }

    const playCurrent = async () => {
      const music = queue.current
      if (!music) {
        return stop()
      }
      if (music === currentMusic) {
        return
      }
      const stream = await ytdl(music.url, { filter: 'audioonly', highWaterMark: 1 << 25 })
      audioResource = createAudioResource(stream, { inlineVolume: true })
      audioPlayer.play(audioResource)
      timer.start()
      currentMusic = music
    }


    const setPause = (isPaused) => {
      timer[isPaused && 'pause' || 'resume']()
      audioPlayer[isPaused && 'pause' || 'unpause']()
    }

    audioPlayer.on('idle', currentEnded)
    queue.on('changed', playCurrent)

    const voiceCommandWrapper = (fn) => {
      return async (interaction) => {
        const voiceChannel = interaction.member.voice?.channel
        if (!voiceChannel)
          return

        await fn(interaction)

        await joinChannel(voiceChannel)
        if (audioPlayer.state.status === 'idle') {
          await playCurrent()
        }
      }
    }

    return {
      joinChannel,
      timer,
      get status() { return audioPlayer.state.status },
      setPause,
      playCurrent,
      onCurrentEnded,
      voiceCommandWrapper,
    }
  }
}