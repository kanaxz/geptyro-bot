import { EmbedBuilder } from 'discord.js'
import Event from 'sools-core/types/Event.js'
import { interval } from 'sools-core/utils/promise.js'
import bot from '../../discord/bot.js'
import player from '../../discord/player.js'
import musicPlayer from './musicPlayer.js'
import main from './main.js'

const durationToString = (duration) => {
  let modulo = (duration % 60).toString()
  if (modulo.length === 1) {
    modulo = '0' + modulo
  }
  return `${Math.floor(duration / 60)}:${modulo}`
}

export default {
  name: 'playlistMessage',
  dependencies: [
    bot,
    player,
    musicPlayer,
    main,
  ],
  construct: async ({ bot, player, musicPlayer, musicBot: { queue, musicChannel } }) => {
    let playlistMessage
    const onCreated = new Event()

    const remove = async () => {
      if (!playlistMessage) { return }

      await playlistMessage.delete()
      playlistMessage = null
    }

    const update = interval(async () => {
      const embed = new EmbedBuilder()

      if (queue.length) {
        const currentMusic = queue.current
        const musics = queue.map((music, index) => {
          return {
            index: currentMusic === music && 'now' || index + 1,
            name: `[${music.name}](${music.url})`,
            user: music.username,
            duration: music.duration,
          }
        })
        const fields = ['index', 'name', 'user'].map((fieldName) => {
          return {
            name: fieldName,
            value: musics.map((music) => music[fieldName]).join('\n'),
            inline: true,
          }
        })

        embed
          .addFields([...fields])
          .setTitle(`Playlist ${' '.repeat(70)}  ${durationToString(musicPlayer.timer.duration())} / ${currentMusic.duration} ${' '.repeat(10)} ${player.status === 'paused' && '⏸️' || ''}`)
          .setDescription(' ')
          .setImage(currentMusic.thumbnail)
      } else {
        embed.setDescription('No tracks')
      }

      if (playlistMessage) {
        await playlistMessage.edit({ embeds: [embed] })
      } else {
        playlistMessage = await musicChannel.send({ embeds: [embed] })
        onCreated.trigger(playlistMessage)
      }
    }, 1000 * 10)

    bot.on('messageCreate', async (message) => {
      if (message.channel.id !== musicChannel.id) { return }
      if (!playlistMessage || message.id === playlistMessage.id) { return }

      await remove()
      await update()
    })

    const showCurrentEnded = async (music) => {
      if (!music) { return }

      await musicChannel.send(`Music [${music.name}](${music.url}) added by ${music.username} finished`)
    }

    musicPlayer.onCurrentEnded(showCurrentEnded)

    return {
      onCreated,
    }
  }
}