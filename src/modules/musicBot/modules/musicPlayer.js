import ytdl from '@distube/ytdl-core'
import Timer from '../Timer.js'
import Event from 'sools-core/types/Event.js'
import main from './main.js'
import player from '../../discord/player.js'

export default {
  name: 'musicPlayer',
  dependencies: [
    main,
    player,
  ],
  construct: ({ player, musicBot: { queue } }) => {
    const timer = new Timer()
    let currentMusic

    const onCurrentEnded = new Event()

    player.onCurrentEnded(() => {
      const current = queue.removeCurrent()
      onCurrentEnded.trigger(current)
    })

    const playCurrent = async () => {
      const music = queue.current
      if (!music) {
        return
      }
      if (music === currentMusic) {
        return
      }
      const stream = await ytdl(music.url, {
        filter: 'audioonly',
        quality: 'highestaudio',
        highWaterMark: 1 << 24,
      })


      player.play(stream)
      timer.start()
      currentMusic = music
    }

    player.onPauseChanged((isPaused) => {
      timer[isPaused && 'pause' || 'resume']()
      audioPlayer[isPaused && 'pause' || 'unpause']()
    })

    queue.on('changed', playCurrent)

    const voiceCommandWrapper = (fn) => {
      return async (interaction) => {
        const voiceChannel = interaction.member.voice?.channel
        if (!voiceChannel)
          return

        await fn(interaction)

        await player.joinChannel(voiceChannel)
        if (player.status === 'idle') {
          await playCurrent()
        }
      }
    }

    return {
      timer,
      playCurrent,
      onCurrentEnded,
      voiceCommandWrapper,
    }
  }
}