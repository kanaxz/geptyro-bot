const ytdl = require('ytdl-core-discord')

const { joinVoiceChannel, createAudioPlayer, getVoiceConnection, createAudioResource, } = require('@discordjs/voice')
const { deleteAllMessagesOfChannel } = require('../../utils/discord')
const { parseCommand } = require('../../utils/command')
const { MessageEmbed } = require('discord.js')
const Playlist = require('./Playlist')

const YOUTUBE_URL = 'https://www.youtube.com'

module.exports = async ({ youtube, bot }) => {
  let playlist = new Playlist()
  let voiceConnection
  let playlistMessage
  const audioPlayer = createAudioPlayer()

  const musicChannel = bot.channels.cache.find(channel => channel.name === 'music-bot')
  if (!musicChannel) {
    throw new Error('Music channel not found')
  }

  await deleteAllMessagesOfChannel(musicChannel)

  audioPlayer.on('idle', async () => {
    const music = playlist.endCurrent()
    await musicChannel.send(`Played ${music.url} by ${music.username}`)
    updatePlaylistMessage()
    await play()
  })

  const processPlayArgs = async (msg, query, handlePlaylist) => {
    const voiceChannel = msg.member.voice?.channel
    if (!voiceChannel)
      return

    if (query.startsWith(YOUTUBE_URL)) {
      const url = new URL(query)

      const videoId = url.searchParams.get('v')
      if (!videoId) {
        return
      }
      const { data: { items: [video] } } = await youtube.videos.list({
        part: ['id', 'snippet'],
        id: videoId
      })
      if (!video)
        return
      addVideo({ id: videoId, title: video.snippet.title }, msg.author)

      const list = url.searchParams.get('list')
      if (handlePlaylist && list && list !== 'LL') {
        const result = await youtube.playlistItems.list({
          part: ['id', 'snippet'],
          playlistId: list,
          maxResults: 5
        })
        for (const video of result.data.items) {
          addVideo({ title: video.snippet.title, id: video.snippet.resourceId.videoId }, msg.author)
        }
      }
    } else {
      const { data: { items: [video] } } = await youtube.search.list({
        part: ['id', 'snippet'],
        maxResults: 1,
        type: ['video'],
        q: query
      })
      if (!video)
        return
      addVideo({ id: video.id.videoId, title: video.snippet.title }, msg.author)
    }

    updatePlaylistMessage()
    await start(voiceChannel)
  }

  const commands = {
    play: async (msg, ...args) => {
      await processPlayArgs(msg, ...args)
    },
    playlist: async (msg, ...args) => {
      await processPlayArgs(msg, ...args, true)
    }
  }

  bot.on("messageCreate", async (msg) => {
    if (msg.channel.id === musicChannel.id && msg.author.id !== bot.user.id) {
      // timeout to prevent UI bug in discord for users
      setTimeout(() => msg.delete(), 2000)
    }
    const command = parseCommand(bot, msg)
    if (!command) {
      return
    }

    if (commands[command.name]) {
      await commands[command.name](msg, ...command.args)
    }
  })

  const getStatus = () => {
    return audioPlayer.state.status
  }

  const isPaused = () => {
    return getStatus() === 'paused'
  }

  const reactions = {
    '⏮️': {
      check: () => playlist.canPrevious(),
      execute: async () => {
        playlist.previous()
        updatePlaylistMessage()
        await play()
      }
    },
    '⏹️': {
      check: () => true,
      execute: async () => {
        await stop()
      }
    },
    '⏸️': {
      check: () => !isPaused(),
      execute: async () => {
        audioPlayer.pause()
      }
    },
    '⏯️': {
      check: () => isPaused(),
      execute: async () => {
        audioPlayer.unpause()
      }
    },
    '⏭️': {
      check: () => playlist.canNext(),
      execute: async () => {
        playlist.next()
        updatePlaylistMessage()
        await play()
      }
    },
  }


  const updateReactions = async (scopeStateMessage) => {
    try {
      await scopeStateMessage.reactions.removeAll()
      for (const reactionName in reactions) {
        if (reactions[reactionName].check()) {
          await scopeStateMessage.react(reactionName)
        }
      }
    } catch (e) {

    }
  }

  const updatePlaylistMessage = async () => {
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

    playlistMessage = scopePlaylistMessage = await musicChannel.send({ embeds: [embed] })

    if (playlist.length) {
      updateReactions(scopePlaylistMessage)
      const filter = (reaction, user) => {
        return user.id !== bot.user.id && reactions[reaction.emoji.name]
      }
      const collector = scopePlaylistMessage.createReactionCollector({ filter, time: 1000 * 60 * 5 });
      collector.on('collect', async (reaction, user) => {
        await reactions[reaction.emoji.name].execute()
        await updateReactions(scopePlaylistMessage)
      })
    }
  }

  const stop = async () => {
    playlist = new Playlist()
    if (voiceConnection) {
      voiceConnection.disconnect()
      voiceConnection.destroy()
      voiceConnection = null
    }
    if (playlistMessage) {
      await playlistMessage.delete()
      playlistMessage = null
    }
  }

  const start = async (voiceChannel) => {
    if (voiceConnection) {
      if (voiceConnection.joinConfig.channelId === voiceChannel.id) {
        if (getStatus() === 'idle') {
          await play()
        }
        return
      }
      await stop()
    }

    voiceConnection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    })

    voiceConnection.subscribe(audioPlayer)
    await play()
  }



  const play = async () => {
    const music = playlist.current()
    if (!music) {
      return
    }
    console.log("playing", music)
    const stream = await ytdl(music.url, { filter: 'audioonly', highWaterMark: 1 << 25 });
    const audioResource = createAudioResource(stream, { inlineVolume: true })
    audioPlayer.play(audioResource)
  }

  const addVideo = (video, author) => {
    if (!video || video.title === 'Deleted video')
      return

    playlist.push({
      username: author.username,
      url: `${YOUTUBE_URL}/watch?v=${video.id}`,
      name: video.title
    })
  }
}