const commands = [
  require('./play'),
  require('./playlist'),
]
module.exports = {
  name: null,
  dependencies: ['bot', 'musicBot', 'player', 'youtube'],
  construct: async (deps) => {
    const { bot } = deps
    for (const command of commands) {
      const result = await command(deps)
      bot.commands.set(result.data.name, result)
    }
  }
}