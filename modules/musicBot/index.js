
module.exports = async (self, { bot }) => {
  self.musicChannel = bot.channels.cache.find(channel => channel.name === 'music-bot')
  if (!self.musicChannel) {
    throw new Error('Music channel not found')
  }
}