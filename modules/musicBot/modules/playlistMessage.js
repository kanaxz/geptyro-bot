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

  playlist.after('finish', updatePlaylistMessage)
  commands.before('playCurrent', updatePlaylistMessage)
  commands.after('musicsAdded', () => {
    // if not playing, already handled through playCurrent event
    if (commands.status === 'idle')
      return
    updatePlaylistMessage()
  })
  commands.after('currentEnded', async (music) => {
    await musicBot.musicChannel.send(`Played ${music.url} by ${music.username}`)
  })
  commands.before('stop', async () => {
    if (playlistMessage) {
      playlistMessage.delete()
      playlistMessage = null
    }
  })


}