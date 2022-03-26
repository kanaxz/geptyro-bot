
module.exports = (self, { playlist, playlistMessage, commands, bot }) => {

  const isPaused = () => {
    return commands.status === 'paused'
  }

  const reactions = {
    '⏮️': {
      check: playlist.canPrevious,
      execute: playlist.previous,
    },
    '⏹️': {
      check: () => true,
      execute: commands.stop,
    },
    '⏸️': {
      check: () => !isPaused(),
      execute: commands.pause,
    },
    '⏯️': {
      check: isPaused,
      execute: commands.unpause,
    },
    '⏭️': {
      check: playlist.canNext,
      execute: playlist.next,
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

  playlistMessage.after('update', async (scopePlaylistMessage) => {
    if (!playlist.length) {
      return
    }
    updateReactions(scopePlaylistMessage)
    const filter = (reaction, user) => {
      return user.id !== bot.user.id && reactions[reaction.emoji.name]
    }
    const collector = scopePlaylistMessage.createReactionCollector({ filter, time: 1000 * 60 * 5 });
    collector.on('collect', async (reaction, user) => {
      await reactions[reaction.emoji.name].execute()
      await updateReactions(scopePlaylistMessage)
    })
  })
}