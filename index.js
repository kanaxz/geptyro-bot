const { Client, Intents } = require("discord.js")

const bot = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
  partials: ['CHANNEL', 'MESSAGE','REACTION'],
});

const commandsInits = {
  play: require('./commands/play')
}

const commands = {}

bot.on("ready", async () => {
  console.log(`Logged in as ${bot.user.tag}!`)

  for (const commandName in commandsInits) {
    commands[commandName] = await commandsInits[commandName](bot)
  }

})

bot.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith('!') || msg.author.username === bot.user.username) {
    return
  }

  const [commandName, ...args] = msg.content.replace('!', '').split(' ')
  const command = commands[commandName]
  if (!command) {
    return
  }
  console.log(commandName, ...args)
  await command(msg, ...args)
})

bot.login("OTU2NjgzNDg1MDgxMzg3MDc4.Yjzy7Q.GqWNLPPkrerAF7qn9gtCIvPJ3EU");