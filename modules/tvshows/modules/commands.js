const { MessageEmbed } = require('discord.js')
const NavigationMessage = require('../NavigationMessage')
const { buildEmbedMessageFields } = require('../../../utils/discord')
const { tryDeleteMessage } = require('../../../utils/discord')
const moment = require('moment')

const indexes = ['🔴', '🟡', '🔵', '🟢', '🟣', '🟠', '🟤', '⚫', '⚪', '🟥', '🟨', '🟦', '🟩', '🟪', '🟧', '🟫', '⬛', '⬜']

const PROGRAM = 'tvshow'

const calendarFormatting = {
  lastDay: '[Yesterday]',
  sameDay: '[Today]',
  nextDay: '[Tomorrow]',
  lastWeek: '[last] dddd',
  nextWeek: 'dddd',
  sameElse: 'L'
}

const parseIndex = (index, max) => {
  index = parseInt(index)

  if (isNaN(index) || index < 0 || max && index >= max) {
    return
  }
  return index
}

const getElement = (array, work) => {
  return async (msg) => {
    const index = parseIndex(msg.content, array.max)
    if (!index)
      return
    await work(array[index - 1], msg)
    tryDeleteMessage(msg)
    return true
  }
}

const diffAsDay = (a, b) => {
  let diff = a.startOf('day').diff(b.startOf('day'), 'days')
  if (diff === 0)
    return 'today'
  diff = diff.toString()
  if (diff > 0)
    diff = `+${diff}`
  return diff
}

const formatDateDay = (date) => {
  return `${date.format('dddd')} (${diffAsDay(date, moment.utc(moment()))})`
}

const display = (init) => {
  return async (navigation, ...args) => {

    let error
    const tasks = []

    const executeTask = (task) => {
      setTimeout(async () => {
        try {
          await task()
        } catch (e) {
          error = e
          console.error(e)
        }
        navigation.update(await update())
      })
    }

    const self = {
      async task(task) {
        tasks.push(task)
        executeTask(task)
      }
    }
    const displayUpdate = await init.call(self, navigation, ...args)

    const update = async () => {
      const embed = new MessageEmbed()
      embed.setTitle(self.title)
      let display = {
        embeds: [embed],
        reactions: {
          '🔁': async () => {
            error = null
            for (const task of tasks) {
              executeTask(task)
            }
            navigation.update(await update())
          }
        },
      }
      if (error) {
        embed.setDescription(error.message)
      } else {
        const result = await displayUpdate(embed)
        if (result && result !== embed) {
          display = {
            ...display,
            ...result,
            reactions: {
              ...display.reactions,
              ...(result.reactions || {})
            },
            embeds: [...display.embeds, ...(result.embeds || [])]
          }
        }
      }
      return display
    }

    return await update()
  }
}

module.exports = ({ tvshows, bot, imdb, piratebay, tinyUrl }) => {

  const displays = {
    search: display(function (navigation, title) {
      let series
      this.title = `Search results: ${title}`
      this.task(async () => {
        series = null
        series = await tvshows.search(title)
        series.forEach((serie, index) => {
          serie.index = index + 1
        })
      })

      return (embed) => {
        if (!series)
          return embed.setDescription('searching ...')
        if (!series.length)
          return embed.setDescription('No result')

        const fields = buildEmbedMessageFields(series, ['index', 'title', 'description'])
        embed.addFields(fields)
        const messageHandler = getElement(series, (serie) => {
          navigation.navigate(displays.serie(navigation, serie))
        })

        return {
          messageHandler
        }
      }
    }),
    async serie(navigation, serie) {
      const update = async () => {

        const embed = new MessageEmbed()
        embed.setTitle(`${serie.title} ${' '.repeat(50)} ${serie._id && `${serie.userIds.length}  👁️` || ''}`)
        embed.setDescription(serie.description)
        embed.setImage(serie.image)

        const reactions = {
          '👁️': async () => {
            await tvshows.toggleTrackSerie(serie, navigation.message.author.id)
            await navigation.update(update())
          }
        }

        let messageHandler
        const seasons = await tvshows.loadSeasons(serie)
        const fields = buildEmbedMessageFields(seasons, ['index', 'date', 'count'])
        embed.addFields(fields)

        messageHandler = getElement(seasons, (season) => {
          navigation.navigate(displays.season(navigation, season))
        })



        return {
          embed,
          reactions,
          messageHandler,
        }
      }

      return await update()
    },
    async season(navigation, season) {
      const embed = new MessageEmbed()

      embed.setTitle(season.fullTitle)
      const fields = buildEmbedMessageFields(season.episodes, ['index', 'title', 'released'])
      embed.addFields(fields)

      const messageHandler = getElement(season.episodes, (episode) => {
        navigation.navigate(displays.episode(navigation, episode))
      })

      return {
        embed,
        messageHandler,
      }
    },
    async episode(navigation, episode) {
      const embed = new MessageEmbed()

      embed.setTitle(`${episode.fullTitle} ${episode.title}`)
      embed.setDescription(episode.plot)
      let torrents = await piratebay.getTorrents({
        q: episode.fullTitle,
        cat: piratebay.categories.video,
      })
      torrents = torrents.sort((a, b) => b.seeds - a.seeds).slice(0, 10)
      torrents.forEach((torrent, index) => torrent.index = index + 1)
      const fields = buildEmbedMessageFields(torrents.map((torrent, index) => ({
        index: index + 1,
        name: torrent.name,
        'size / seeders': `${torrent.size} / ${torrent.seeders}`
      })))
      embed.addFields(fields)

      const messageHandler = getElement(torrents, async (torrent, msg) => {
        const tiny = await tinyUrl.create(torrent.magnet)
        const torrentMessage = await msg.author.send(`${torrent.name} ${tiny.tiny_url}`)
      })

      return {
        embed,
        messageHandler
      }
    },
    async list(navigation) {
      const embed = new MessageEmbed()

      embed.setTitle(`List`)

      const series = await tvshows.getSeries()
      series.forEach((serie, index) => serie.index = index + 1)
      const fields = buildEmbedMessageFields(series, ['index', 'title', 'description'])
      embed.addFields(fields)

      const messageHandler = getElement(series, async (serie) => {
        navigation.navigate(displays.serie(navigation, serie))
      })


      return {
        embed,
        messageHandler
      }
    },
    episodes: display(function (navigation, startDate, endDate) {
      let episodes
      startDate = startDate.startOf('day')
      endDate = endDate.endOf('day')
      console.log(startDate, endDate)
      console.log(startDate.toDate(), endDate.toDate())
      this.title = `Episodes from ${formatDateDay(startDate)}`
      if (!startDate.isSame(endDate, 'days')) {
        this.title += ` to ${formatDateDay(endDate)}`
      }
      this.task(async () => {
        episodes = null
        episodes = await tvshows.episodes({
          released: {
            $gt: startDate.toDate(),
            $lt: endDate.toDate()
          }
        })
        console.log(episodes)
      })

      return (mainEmbed) => {
        if (!episodes)
          return mainEmbed.setDescription('searching ...')

        if (!episodes.length)
          return mainEmbed.setDescription('No results')

        const days = episodes.reduce((days, episode) => {
          let day = days.find((d) => d.date === episode.released)
          if (!day) {
            day = {
              date: episode.released,
              episodes: []
            }
            days.push(day)
          }
          day.episodes.push(episode)
          return days
        }, [])
        let index = 0
        const embeds = days.map((day) => {
          const embed = new MessageEmbed()
          embed.setTitle(formatDateDay(moment.utc(day.date)))
          const fields = buildEmbedMessageFields(day.episodes.map((episode) => ({
            index: ++index,
            title: episode.fullTitle,
          })))
          embed.addFields(fields)
          return embed
        })

        const messageHandler = getElement(episodes, (episode) => {
          navigation.navigate(displays.episode(navigation, episode))
        })

        return {
          embeds,
          messageHandler
        }
      }
    }),
  }

  const episodesCommand = (daysToAdd) => {
    return async (channel, index) => {
      const navigationMessage = new NavigationMessage(bot)
      let startDate = moment.utc(moment())
      index = parseInt(index)
      if (index && !isNaN(index)) {
        startDate = startDate.add(index, 'days')
      }
      const endDate = startDate.clone().add(daysToAdd, 'days')
      console.log(startDate, endDate)
      const display = await displays.episodes(navigationMessage, startDate, endDate)
      await navigationMessage.start(channel, display)
    }
  }

  const commands = {
    async search(channel, ...args) {
      const title = args.join(' ')
      const navigationMessage = new NavigationMessage(bot)
      const display = displays.search(navigationMessage, title)
      await navigationMessage.start(channel, display)
    },
    async list(channel) {
      const navigationMessage = new NavigationMessage(bot)
      const display = await displays.list(navigationMessage)
      await navigationMessage.start(channel, display)
    },
    week: episodesCommand(7),
    day: episodesCommand(0)
  }

  bot.on('messageCreate', async (msg) => {
    if (!msg.content.startsWith(PROGRAM))
      return
    const [, commandName, ...args] = msg.content.replace(PROGRAM, '').split(' ')
    if (commands[commandName]) {
      await commands[commandName](msg.channel, ...args)
    }
  })

  return commands

}