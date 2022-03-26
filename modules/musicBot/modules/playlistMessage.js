const { MessageEmbed } = require('discord.js')

module.exports = (self, { musicBot, playlist, commands }) => {
  let playlistMessage
  const updatePlaylistMessage = self.event('update', async () => {
    if (playlistMessage) {
      await playlistMessage.delete()
      playlistMessage = null
    }
    let scopePlaylistMessage

    const embed = new MessageEmbed()
    embed.setTitle('Playlist')

    if (playlist.length) {
      const musics = playlist.map(({ url, name, username }, index) => {
        console.log(index, playlist.currentIndex)
        return {
          position: index - playlist.currentIndex || 'now',
          name: `[${name}](${url})`,
          user: username,
        }
      })
      const fields = ['position', 'name', 'user'].map((fieldName) => {
        return {
          name: fieldName,
          value: musics.map((music) => music[fieldName]).join('\n'),
          inline: true,
        }
      })
      embed.addFields(fields)
    } else {
      embed.setDescription('No tracks')
    }

    playlistMessage = scopePlaylistMessage = await musicBot.musicChannel.send({ embeds: [embed] })
    return scopePlaylistMessage
  })

  commands.on('start', (next, ...args) => {
    updatePlaylistMessage()
    return next(...args)
  })

  commands.on('stop', async (next) => {
    if (playlistMessage) {
      playlistMessage.delete()
      playlistMessage = null
    }
    return next()
  })

  playlist.on('change', (next) => {
    const music = next()
    updatePlaylistMessage()
    return music
  })

  playlist.on('endCurrent', async (next) => {
    const music = await next()
    setTimeout(async () => {
      await musicBot.musicChannel.send(`Played ${music.url} by ${music.username}`)
      await updatePlaylistMessage()
    })
    return music
  })
}