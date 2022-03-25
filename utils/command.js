const parseCommand = (bot, msg) => {
  if (!msg.content.startsWith('!') || msg.author.username === bot.user.username) {
    return null
  }
  const [name, ...args] = msg.content.replace('!', '').split(' ')
  return { name, args }
}

module.exports = {
  parseCommand,
}