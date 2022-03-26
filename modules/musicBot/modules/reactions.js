
module.exports = (self, { musicBot, playlist, playlistMessage, commands, bot }) => {
  const state = musicBot.state
  const isPaused = () => {
    return commands.status === 'paused'
  }

  const reactions = {
    '⏮️': {
      check: () => playlist.length > 1,
      execute: playlist.previous,
    },
    '⏹️': {
      check: () => true,
      execute: commands.stop,
    },
    '⏸️': {
      check: () => true,
      execute: () => {
        commands.setPause(!isPaused())
      },
    },
    '⏭️': {
      check: () => playlist.length > 1,
      execute: playlist.next,
    },
    '🔇': {
      check: () => true,
      execute: () => {
        commands.setMute(!commands.isMute)
      }
    },
    '🔁': {
      check: () => true,
      execute: () => {
        commands.setRepeat(!state.repeat)
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
    const collector = message.createReactionCollector({ filter, time: 1000 * 60 * 5 });
    collector.on('collect', async (reaction, user) => {
      await reactions[reaction.emoji.name].execute(reaction)
    })
  })
}