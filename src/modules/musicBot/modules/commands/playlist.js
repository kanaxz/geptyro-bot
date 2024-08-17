const { SlashCommandBuilder } = require('discord.js')

module.exports = ({ player, youtube, musicBot }) => {
  const execute = player.voiceCommandWrapper(async (interaction) => {
    const query = interaction.options.getString('query')

    const url = new URL(query)
    const list = url.searchParams.get('list')
    if (!list || list === 'LL') {
      await interaction.reply({
        content: `Playlist not found`,
        ephemeral: true
      })
      return
    }
    const { data: { items } } = await youtube.api.playlistItems.list({
      part: ['snippet'],
      playlistId: list,
      maxResults: 6
    })

    for (const partialVideo of items) {
      const video = await youtube.getVideo(partialVideo.snippet.resourceId.videoId)
      await musicBot.addMusic(video, interaction)
    }

    await interaction.reply({
      content: `Added ${items.length} music from playlist`,
      ephemeral: true
    })
  })

  return {
    data: new SlashCommandBuilder()
      .setName('playlist')
      .setDescription('Play a youtube playlist !')
      .addStringOption((option) => option
        .setName('query')
        .setDescription('Youtube query, either keyword or url')
        .setRequired(true)
      ),
    execute,
  }
} 