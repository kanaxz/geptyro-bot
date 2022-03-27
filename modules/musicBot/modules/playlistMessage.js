const { MessageEmbed } = require('discord.js')
const { ellipse } = require('../../../utils/string')

const durationToString = (duration) => {
  let modulo = (duration % 60).toString()
  if (modulo.length === 1) {
    modulo = '0' + modulo
  }
  return `${Math.floor(duration / 60)}:${modulo}`
}

module.exports = (self, { player, musicBot, playlist, commands }) => {
  let playlistMessage
  let shouldResend = false
  const state = musicBot.state

  const create = self.event('create')

  const updatePlaylistMessage = async () => {
    if (playlistMessage && shouldResend) {
      await playlistMessage.delete()
      playlistMessage = null
      shouldResend = false
    }

    const currentMusic = playlist.current()
    if (!currentMusic) return

    const embed = new MessageEmbed()

    if (playlist.length) {

      const musics = playlist.map(({ url, name, username, duration }, index) => {
        return {
          index: index === playlist.currentIndex && 'now' || index + 1,
          name: `[${name}](${url})`,
          user: username,
          duration,
        }
      })
      const fields = ['index', 'name', 'user'].map((fieldName) => {
        return {
          name: fieldName,
          value: musics.map((music) => music[fieldName]).join('\n'),
          inline: true,
        }
      })

      embed.addFields([...fields])
        .setTitle(`Playlist ${' '.repeat(40)}  ${durationToString(player.timer.duration())} / ${currentMusic.duration} ${' '.repeat(30)} ${player.isMute && '🔇' || `${state.volume}   🔊`}  ${state.repeat && '🔁' || ''}  ${player.status === 'paused' && '⏸️' || ''}`)
      //.setImage(currentMusic.thumbnail)
    } else {
      embed.setDescription('No tracks')
    }

    if (playlistMessage) {
      await playlistMessage.edit({ embeds: [embed] })
    } else {
      playlistMessage = await musicBot.musicChannel.send({ embeds: [embed] })
      create(playlistMessage)
    }

    return playlistMessage
  }

  playlist.after('finish', updatePlaylistMessage)

  commands.after('musicsAdded', () => {
    // if idle, playCurrent will be triggered    
    if (player.status === 'idle')
      return
    updatePlaylistMessage()
  })

  player.before('playCurrent', updatePlaylistMessage)
  player.after('changed', updatePlaylistMessage)

  setInterval(updatePlaylistMessage, 1000 * 10)

  player.after('currentEnded', async (music) => {
    if (!music || state.repeat) return
    shouldResend = true
    await musicBot.musicChannel.send(`Played ${music.url} by ${music.username}`)

  })
  player.before('stop', async () => {
    if (playlistMessage) {
      playlistMessage.delete()
      playlistMessage = null
    }
  })
}