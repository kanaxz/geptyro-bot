import { joinVoiceChannel, createAudioPlayer, createAudioResource, } from '@discordjs/voice'
import Event from 'sools-core/types/Event.js'

export default {
  name: 'player',
  construct: () => {
    const audioPlayer = createAudioPlayer()
    let audioResource
    let voiceConnection
    let stream
    const onCurrentEnded = new Event()
    const onPauseChanged = new Event()

    const currentEnded = () => {
      onCurrentEnded.trigger()
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

    const play = async (_stream) => {
      if (stream?.stop) {
        stream.stop()
      }
      stream = _stream
      audioResource = createAudioResource(stream, { inlineVolume: false })
      audioPlayer.play(audioResource)
    }


    const setPause = (isPaused) => {
      audioPlayer[isPaused && 'pause' || 'unpause']()
      onPauseChanged.trigger(isPaused)
    }

    audioPlayer.on('idle', currentEnded)

    return {
      joinChannel,
      get status() { return audioPlayer.state.status },
      setPause,
      onCurrentEnded,
      onPauseChanged,
      play,
    }
  }
}