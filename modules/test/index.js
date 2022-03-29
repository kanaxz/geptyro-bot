const { deleteAllMessagesOfChannel, deleteLastMessagesOfChannel } = require('../../utils/discord')

const PROGRAM = 'test'

module.exports = async ({ bot, piratebay }) => {
  const channel = bot.channels.cache.find(channel => channel.name === 'test')
  await deleteAllMessagesOfChannel(channel)

  const commands = {
    async clear(channel, index) {
      index = parseInt(index)
      if (!index || isNaN(index))
        return
      await deleteLastMessagesOfChannel(channel, index)
    }
  }

  bot.on('messageCreate', async (msg) => {
    if (msg.author.username !== 'KANAX' || !msg.content.startsWith(PROGRAM))
      return
    const [, commandName, ...args] = msg.content.replace(PROGRAM, '').split(' ')
    if (commands[commandName]) {
      await commands[commandName](msg.channel, ...args)
    }
  })
}