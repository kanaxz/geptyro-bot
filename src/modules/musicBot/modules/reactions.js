module.exports = {
  dependencies: [
    require('./player'),
    require('./main'),
    require('./playlistMessage'),
    require('../../bot'),
  ],
  construct: ({ player, musicBot: { queue }, playlistMessage, bot }) => {

    const isPaused = () => {
      return player.status === 'paused'
    }

    const reactions = {
      '⏮️': {
        check: () => queue.length > 1,
        execute: () => queue.previous(),
      },
      '⏹️': {
        check: () => true,
        execute: () => queue.splice(0, queue.length),
      },
      '⏸️': {
        check: () => true,
        execute: () => {
          player.setPause(!isPaused())
        },
      },
      '⏭️': {
        check: () => queue.length > 1,
        execute: () => queue.next(),
      },
    }

    const addReactions = async (message) => {
      await message.reactions.removeAll()
      for (const reactionName in reactions) {
        await message.react(reactionName)
      }
    }

    playlistMessage.onCreated(async (message) => {
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
}