import main from './modules/main.js'
import commands from './modules/commands/index.js'
import musicPlayer from './modules/musicPlayer.js'
import playerlistMessage from './modules/playlistMessage.js'
import reactions from './modules/reactions.js'

export default {
  modules: [
    main,
    commands,
    musicPlayer,
    playerlistMessage,
    reactions
  ],
}