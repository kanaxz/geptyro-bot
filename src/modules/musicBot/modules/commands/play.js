const { SlashCommandBuilder } = require('discord.js')

module.exports = ({ youtube, player, musicBot }) => {
  const getVideoFromQuery = async (interaction) => {
    const query = interaction.options.getString('query')
    if (query.startsWith(youtube.url)) {
      const url = new URL(query)
      const videoId = url.searchParams.get('v')
      const video = await youtube.getVideo(videoId)
      return video
    } else {
      const { data: { items: [partialVideo] } } = await youtube.api.search.list({
        part: 'snippet',
        maxResults: 1,
        type: 'video',
        q: query
      })
      const video = await youtube.getVideo(partialVideo.id.videoId)
      return video
    }
  }

  const execute = player.voiceCommandWrapper(async (interaction) => {
    const video = await getVideoFromQuery(interaction)
    if (!video || video.snippet.title === 'Deleted video') {
      await interaction.reply({
        content: `Music not found`,
        ephemeral: true
      })
      return
    }
    const music = musicBot.addMusic(video, interaction)

    await interaction.reply({
      content: `Music [${music.name}](${music.url}) has been added`,
      ephemeral: true
    })
  })


  return {
    data: new SlashCommandBuilder()
      .setName('play')
      .setDescription('Play a youtube music !')
      .addStringOption((option) => option
        .setName('query')
        .setDescription('Youtube query, either keyword or url')
        .setRequired(true)
      ),
    execute,
  }
} 