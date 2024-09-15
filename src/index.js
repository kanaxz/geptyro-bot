import bot from './modules/discord/bot.js'
import musicBot from './modules/musicBot/index.js'
import youtube from './modules/youtube/index.js'
import playbackBot from './modules/playbackBot/index.js'

export default {
  modules: [
    bot,
    musicBot,
    youtube,
    playbackBot
  ]
}