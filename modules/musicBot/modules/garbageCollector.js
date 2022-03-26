const { deleteAllMessagesOfChannel } = require('../../../utils/discord')

module.exports = async (self, { musicBot, bot }) => {

  await deleteAllMessagesOfChannel(musicBot.musicChannel)

  bot.on("messageCreate", async (msg) => {
    if (msg.channel.id === musicBot.musicChannel.id && msg.author.id !== bot.user.id) {
      // timeout to prevent UI bug in discord for users
      setTimeout(() => msg.delete(), 2000)
    }
  })
}