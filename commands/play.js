const playDl = require('play-dl')
const { joinVoiceChannel, createAudioPlayer, getVoiceConnection, createAudioResource } = require('@discordjs/voice')
const { deleteAllMessagesOfChannel } = require('../utils/discord')

class Playlist extends Array {
  constructor() {
    super()
    this.currentIndex = 0
  }

  canNext() {
    return this.length > this.currentIndex + 1
  }

  canPrevious() {
    return this.currentIndex - 1 >= 0
  }

  next() {
    if (!this.canNext()) {
      throw new Error('Cannot go next')
    }
    return this[++this.currentIndex]
  }

  previous() {
    if (!this.canPrevious()) {
      throw new Error('Cannot go previous')
    }
    return this[--this.currentIndex]
  }

  current() {
    return this[this.currentIndex]
  }

  endCurrent() {
    const current = this.current()
    this.splice(this.currentIndex, 1)
    if (this.currentIndex >= this.length) {
      this.currentIndex--
    }
    return current
  }
}


module.exports = async (bot) => {
  const playlist = new Playlist()
  let isPaused = false
  let playStream
  let voiceConnection
  let audioPlayer
  let stateMessage
  const musicChannel = bot.channels.cache.find(channel => channel.name === 'music-bot')
  if (!musicChannel) {
    throw new Error('Music channel not found')
  }

  //await deleteAllMessagesOfChannel(musicChannel)
  console.log("ready")

  bot.on("messageCreate", async (msg) => {
    if (msg.channel.id === musicChannel.id && msg.author.id !== bot.user.id) {
      await msg.delete()
    }
  })

  const reactions = {
    '⏮️': {
      check: () => playlist.canPrevious(),
      execute: async () => {
        isPaused = false
        playlist.previous()
        updateStateMessage()
        await play()
      }
    },
    '⏸️': {
      check: () => !isPaused,
      execute: async () => {
        playStream.timer.pause()
        isPaused = true
      }
    },
    '⏯️': {
      check: () => isPaused,
      execute: async () => {
        playStream.resume()
        isPaused = false
      }
    },
    '⏭️': {
      check: () => playlist.canNext(),
      execute: async () => {
        isPaused = false
        playlist.next()
        updateStateMessage()
        await play()
      }
    },
  }

  const updateReactions = async () => {
    if (!stateMessage) {
      return
    }
    await stateMessage.reactions.removeAll()
    for (const reactionName in reactions) {
      if (reactions[reactionName].check()) {
        await stateMessage.react(reactionName)
      }
    }
  }

  const updateStateMessage = async () => {
    if (stateMessage) {
      await stateMessage.delete()
    }
    if (playlist.length) {
      const musics = playlist.map((music, index) => {
        return {
          position: index - playlist.currentIndex || 'now',
          ...music
        }
      })
      const fields = ['position', 'url', 'username'].map((fieldName) => {
        return {
          name: fieldName,
          value: musics.map((music) => music[fieldName]).join('\n'),
          inline: true,
        }
      })
      stateMessage = await musicChannel.send({
        embeds: [{
          color: 3447003,
          title: "Playlist",
          fields,
        }]
      })
      await updateReactions()

      const filter = (reaction, user) => {
        return user.id !== bot.user.id && reactions[reaction.emoji.name]
      }

      const collector = stateMessage.createReactionCollector({ filter, time: 1000 * 60 * 5 });

      collector.on('collect', async (reaction, user) => {
        await reactions[reaction.emoji.name].execute()
        await updateReactions()
      })
    } else {
      stateMessage = await musicChannel.send(`Nothing to play`)
    }
    stateMessageId = stateMessage.id

  }

  const start = async (voiceChannel) => {
    if (voiceConnection) {
      if (voiceConnection.joinConfig.channelId === voiceChannel.id) {
        return
      }
      voiceConnection.destroy()
    }

    voiceConnection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    })

    audioPlayer = createAudioPlayer()
    voiceConnection.subscribe(audioPlayer)
    await play()
  }

  const play = async () => {
    if (playStream) {
      //todo
    }
    const music = playlist.current()
    if (!music) {
      return
    }
    playStream = await playDl.stream(music.url)
    const audioResource = createAudioResource(playStream.stream, {
      inputType: playStream.type
    })
    playStream.stream.on('close', async () => {
      setTimeout(async () => {
        if(music !== playlist.current()){
          return
        }
        playlist.endCurrent()
        await musicChannel.send(`Played ${music.url} by ${music.username}`)
        updateStateMessage()
        await play()
      }, 5000)
    })

    audioPlayer.play(audioResource)
  }

  return async (msg, url) => {
    const voiceChannel = msg.member.voice?.channel
    if (!voiceChannel) {
      return
    }
    playlist.push({
      username: msg.author.username,
      url
    })

    updateStateMessage()
    await start(voiceChannel)
  }
}