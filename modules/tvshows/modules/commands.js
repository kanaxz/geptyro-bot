const { MessageEmbed } = require('discord.js')
const NavigationMessage = require('../NavigationMessage')
const { buildEmbedMessageFields } = require('../../../utils/discord')
const { tryDeleteMessage } = require('../../../utils/discord')
const moment = require('moment')

const PROGRAM = 'tvshow'

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
    let taskResult
    const executeTask = (task) => {
      setTimeout(async () => {
        try {
          taskResult = await task()
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
        taskResult,
        embeds: [embed],
        reactions: {
          '🔄': async () => {
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
        const fields = buildEmbedMessageFields(seasons.map((season, index) => ({
          index: index + 1,
          date: season.date,
          episodes: season.episodes.length,
        })))
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

      embed.setTitle(season.getFullPath())
      const fields = buildEmbedMessageFields(season.episodes.map((episode, index) => ({
        index: index + 1,
        title: episode.title,
        date: episode.releasedBeautified,
      })))
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

      embed.setTitle(`${episode.season.getFullPath()} ${episode.title}`)
      embed.setDescription(episode.plot)
      let torrents = await piratebay.getTorrents({
        q: episode.getFullPath(),
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
        await msg.author.send(`${torrent.name} ${tiny.tiny_url}`)
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
        messageHandler,
      }
    },
    episodes: display(function (navigation, startDate, endDate, preventNavigation) {
      let episodes
      startDate = startDate.startOf('day')
      endDate = endDate.endOf('day')
      this.title = `Episodes from ${formatDateDay(startDate)}`
      if (!startDate.isSame(endDate, 'days')) {
        this.title += ` to ${formatDateDay(endDate)}`
      }

      this.task(async () => {
        episodes = null
        episodes = await tvshows.getEpisodes({
          released: {
            $gte: startDate.toDate(),
            $lte: endDate.toDate()
          }
        })
        return episodes
      })

      return (mainEmbed) => {
        if (!episodes)
          return mainEmbed.setDescription('searching ...')

        if (!episodes.length)
          return mainEmbed.setDescription('No results')

        mainEmbed.setDescription(`${startDate.format('DD/MM/YYYY')} - ${endDate.format('DD/MM/YYYY')}`)

        const days = episodes.reduce((days, episode) => {
          let day = days.find((d) => d.date.getTime() === episode.released.getTime())
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
          const date = moment.utc(day.date)
          embed.setTitle(formatDateDay(date))
          const fields = buildEmbedMessageFields(day.episodes.map((episode) => ({
            index: ++index,
            title: episode.getFullPath(),
          })))
          embed.setDescription(date.format('DD/MM/YYYY'))
          embed.addFields(fields)
          return embed
        })

        let messageHandler
        if (!preventNavigation) {
          messageHandler = getElement(episodes, (episode) => {
            navigation.navigate(displays.episode(navigation, episode))
          })
        }

        const reactions = {}
        if (preventNavigation) {
          reactions['🔒'] = () => { }
        }

        return {
          embeds,
          messageHandler,
          reactions,
        }
      }
    }),
  }

  const episodesCommand = (daysToAdd) => {
    return async (channel, index, preventNavigation) => {
      const navigationMessage = new NavigationMessage(bot)
      let startDate = moment.utc(moment())
      index = parseInt(index)
      if (index && !isNaN(index)) {
        startDate = startDate.add(index, 'days')
      }
      const endDate = startDate.clone().add(daysToAdd, 'days')
      const display = await displays.episodes(navigationMessage, startDate, endDate, preventNavigation)
      await navigationMessage.start(channel, display)
      return await display.taskResult
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
    month: episodesCommand(31),
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