const commands = [
  require('./play'),
  require('./playlist'),
]
module.exports = {
  dependencies: [
    require('../../../bot'),
    require('../main'),
    require('../player'),
    require('../../../youtube'),
  ],
  construct: async (deps) => {
    const { bot } = deps
    for (const command of commands) {
      const result = await command(deps)
      bot.commands.set(result.data.name, result)
    }
  }
}