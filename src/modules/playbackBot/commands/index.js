import playback from './playback.js'
import bot from '../../discord/bot.js'
import player from '../../discord/player.js'


const commands = [
  playback,
]
export default {
  dependencies: [
    bot,
    player,
  ],
  construct: async (deps) => {
    const { bot } = deps
    for (const command of commands) {
      const result = await command(deps)
      bot.commands.set(result.data.name, result)
    }
  }
}