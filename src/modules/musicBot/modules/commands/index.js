import bot from '../../../discord/bot.js'
import youtube from '../../../youtube/index.js'
import main from '../main.js'
import musicPlayer from '../musicPlayer.js'
import play from './play.js'
import playlist from './playlist.js'
const commands = [
  play,
  playlist
]
export default {
  dependencies: [
    bot,
    main,
    musicPlayer,
    youtube
  ],
  construct: async (deps) => {
    const { bot } = deps
    for (const command of commands) {
      const result = await command(deps)
      bot.commands.set(result.data.name, result)
    }
  }
}