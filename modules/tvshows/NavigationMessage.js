
const { tryDeleteMessage } = require('../../utils/discord')

const navigationReactions = {
  '⬅️': {
    check: (navigationMessage) => navigationMessage.breadcrumb.length,
    execute: async (navigationMessage) => {
      await navigationMessage.previous()
    }
  }
}


const activablePromise = () => {
  let activate
  const promise = new Promise((resolve) => activate = resolve)
  return {
    activate,
    promise
  }
}

module.exports = class NavigationMessage {
  constructor(bot) {
    this.bot = bot
    this.breadcrumb = []
    this.message = null
    this.currentReactions = []
    this.handleMessages = true
    this.showing
  }

  async start(channel, display) {
    this.channel = channel
    this.current = await display
    await this.showCurrent()

    this.bot.on('messageCreate', async (msg) => {
      if (msg.channel.id !== this.channel.id || !this.handleMessages)
        return

      const messageHandlers = this.current.messageHandlers || this.current.messageHandler && [this.current.messageHandler] || []
      for (const messageHandler of messageHandlers) {
        if (await messageHandler(msg)) {
          return
        }
      }
      this.handleMessages = false
    })
  }

  async navigate(display) {
    this.breadcrumb.push(this.current)
    this.current = await display
    await this.showCurrent()
  }

  async previous() {
    this.current = this.breadcrumb.pop()
    await this.showCurrent()
  }

  async update(display) {
    Object.assign(this.current, await display)
    if (this.showing)
      await this.showing
    const embeds = this.current.embeds || [this.current.embed]
    await this.message.edit({ embeds: embeds })
  }

  async addReactions(display) {
    let reactions = []
    for (const reactionName in navigationReactions) {
      if (navigationReactions[reactionName].check(this)) {
        reactions.push(reactionName)
      }
    }
    if (this.current.reactions) {
      reactions = reactions.concat(Object.keys(this.current.reactions))
    }
    for (const reaction of reactions) {
      if (this.current === display) {
        await this.message.react(reaction)
      }
    }
  }

  async showCurrent() {
    const activable = activablePromise()
    this.showing = activable.promise
    const embeds = this.current.embeds || [this.current.embed]
    if (this.message) {
      await this.message.edit({ embeds })
    } else {
      this.message = await this.channel.send({ embeds })
      const filter = ((reaction, user) => user.id !== this.bot.user.id)
      const collector = this.message.createReactionCollector({ filter, time: 1000 * 60 * 60 * 5 })
      collector.on('collect', async (reaction, user) => {
        console.log(reaction.emoji.name)
        reaction.users.remove(user.id)

        const displayReaction = this.current.reactions && this.current.reactions[reaction.emoji.name]
        if (displayReaction) {
          return await displayReaction()
        }
        const navigationReaction = navigationReactions[reaction.emoji.name]
        if (navigationReaction) {
          return await navigationReaction.execute(this)
        }
      })
    }

    await this.message.reactions.removeAll()
    await this.addReactions(this.current)
    this.showing = null
    await activable.activate()
  }
}