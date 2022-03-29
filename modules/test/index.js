const { deleteAllMessagesOfChannel } = require('../../utils/discord')

module.exports = async ({ bot, piratebay }) => {
  const channel = bot.channels.cache.find(channel => channel.name === 'test')
  await deleteAllMessagesOfChannel(channel)
}