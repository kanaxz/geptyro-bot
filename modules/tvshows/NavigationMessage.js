
const { tryDeleteMessage } = require('../../utils/discord')

const navigationReactions = {
  '⬅️': {
    check: (navigationMessage) => navigationMessage.breadcrumb.length,
    execute: async (navigationMessage) => {
      await navigationMessage.previous()
    }
  }
}

module.exports = class NavigationMessage {
  constructor(bot) {
    this.bot = bot
    this.breadcrumb = []
    this.message = null
    this.currentReactions = []
  }

  async start(channel, display) {
    this.channel = channel
    this.current = display
    await this.showCurrent()

    this.bot.on('messageCreate', async (msg) => {
      if (msg.channel.id !== this.channel.id)
        return

      if (this.current.messageHandler) {
        if (await this.current.messageHandler(msg)) {
          tryDeleteMessage(msg)
        }
      }
    })
  }

  async navigate(display) {
    display = await display
    this.breadcrumb.push(this.current)
    this.current = display
    await this.showCurrent()
  }

  async previous() {
    this.current = this.breadcrumb.pop()
    await this.showCurrent()
  }

  async update(display) {
    Object.assign(this.current, display)
    await this.message.edit({ embeds: [this.current.embed] })
  }

  async addReactions(display) {
    const reactions = []
    for (const reactionName in navigationReactions) {
      if (navigationReactions[reactionName].check(this)) {
        reactions.push(reactionName)
      }
    }
    if (this.current.reactions) {
      for (const reactionName in this.current.reactions) {
        reactions.push(reactionName)
      }
    }
    for (const reaction of reactions) {
      if (this.current === display) {
        await this.message.react(reaction)
      }
    }
  }

  async showCurrent() {
    const embed = this.current.embed
    if (this.message) {
      await this.message.edit({ embeds: [embed] })
    } else {
      this.message = await this.channel.send({ embeds: [embed] })
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
  }
}