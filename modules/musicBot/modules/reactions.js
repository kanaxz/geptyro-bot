
module.exports = ({ player, musicBot, playlist, playlistMessage, bot }) => {
  const state = musicBot.state

  const isPaused = () => {
    return player.status === 'paused'
  }

  const reactions = {
    '⏮️': {
      check: () => playlist.length > 1,
      execute: playlist.previous,
    },
    '⏹️': {
      check: () => true,
      execute: player.stop,
    },
    '⏸️': {
      check: () => true,
      execute: () => {
        player.setPause(!isPaused())
      },
    },
    '⏭️': {
      check: () => playlist.length > 1,
      execute: playlist.next,
    },
    '🔇': {
      check: () => true,
      execute: () => {
        player.setMute(!player.isMute)
      }
    },
    '🔁': {
      check: () => true,
      execute: () => {
        player.setRepeat(!state.repeat)
      }
    },
  }

  const addReactions = async (message) => {
    try {
      await message.reactions.removeAll()
      for (const reactionName in reactions) {
        await message.react(reactionName)
      }
    } catch (e) {

    }
  }

  playlistMessage.after('create', async (message) => {
    addReactions(message)
    const filter = (reaction, user) => {
      if (user.id === bot.user.id) {
        return
      }
      const reactionAction = reactions[reaction.emoji.name]
      reaction.users.remove(user.id)
      return reactionAction && reactionAction.execute()
    }
    const collector = message.createReactionCollector({ filter, time: 1000 * 60 * 60 * 5 })
    collector.on('collect', async (reaction, user) => {
      await reactions[reaction.emoji.name].execute(reaction)
    })
  })
}