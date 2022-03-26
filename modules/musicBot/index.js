
module.exports = async (self, { bot, mongoState }) => {
  self.musicChannel = bot.channels.cache.find(channel => channel.name === 'music-bot')
  self.state = mongoState

  if (!self.musicChannel) {
    throw new Error('Music channel not found')
  }

  self.childrenModulesInitialized = async () => {
    await self.state.save()
  }
}