const { Client, Intents } = require("discord.js")

module.exports = async (self, { config }) => {

  const bot = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
    partials: ['CHANNEL', 'MESSAGE', 'REACTION'],
  })

  const ready = new Promise((resolve) => {
    bot.on("ready", () => {
      console.log(`Logged in as ${bot.user.tag}!`)
      resolve()
    })
  })

  bot.login(config.discordToken)
  await ready
  return bot
}