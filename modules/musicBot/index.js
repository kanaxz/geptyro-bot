
module.exports = async (self, { bot, states }) => {
  self.musicChannel = bot.channels.cache.find(channel => channel.name === 'music-bot')
  self.state = await states.get('musicBot')

  if (!self.musicChannel) {
    throw new Error('Music channel not found')
  }

  self.ready = async () => {
    await self.state.save()
  }
}