const { MessageEmbed } = require('discord.js')
const NavigationMessage = require('../NavigationMessage')
const { buildEmbedMessageFields } = require('../../../utils/discord')
const open = require('open')

const indexes = ['🔴', '🟡', '🔵', '🟢', '🟣', '🟠', '🟤', '⚫', '⚪', '🟥', '🟨', '🟦', '🟩', '🟪', '🟧', '🟫', '⬛', '⬜']

const PROGRAM = 'tvshow'

const parseIndex = (index, max) => {
  index = parseInt(index)
  if (isNaN(index) || index < 0 || index >= max) {
    return
  }
  return index
}

const indexParser = (max, work) => {
  return async (msg) => {
    const index = parseIndex(msg.content, max)
    if (!index)
      return
    await work(index)
    return true
  }
}

module.exports = (self, { tvshows, bot, imdb, piratebay }) => {

  const displays = {
    search(navigation, series) {
      const embed = new MessageEmbed()

      embed.setTitle('Search results')

      series.forEach((serie, index) => {
        serie.index = index + 1
      })

      const fields = buildEmbedMessageFields(series, ['index', 'title', 'description'])

      embed.addFields(fields)

      const messageHandler = indexParser(series.length, (index) => {
        navigation.navigate(displays.serie(navigation, series[index - 1]))
      })

      return {
        embed,
        messageHandler
      }
    },
    async serie(navigation, serie) {

      let dbSerie = await tvshows.getSerie(serie.id)

      const update = () => {

        const embed = new MessageEmbed()
        embed.setTitle(`${serie.title} ${' '.repeat(50)} ${dbSerie && '👁️' || ''}`)
        embed.setDescription(serie.description)
        embed.setImage(serie.image)

        const reactions = {
          '👁️': async () => {
            dbSerie = await tvshows.toggleTrackSerie(serie, navigation.message.author.id)
            await navigation.update(update())
          }
        }

        let messageHandler

        if (dbSerie && dbSerie.seasons) {
          const seasons = dbSerie.seasons
          const fields = buildEmbedMessageFields(seasons, ['index', 'date', 'count'])
          embed.addFields(fields)

          messageHandler = indexParser(dbSerie.seasons.length, (index) => {
            navigation.navigate(displays.season(navigation, dbSerie.seasons[index - 1]))
          })
        }


        return {
          embed,
          reactions,
          messageHandler,
        }
      }

      return update()
    },
    async season(navigation, season) {
      const embed = new MessageEmbed()

      embed.setTitle(season.fullTitle)
      const fields = buildEmbedMessageFields(season.episodes, ['index', 'title', 'released'])
      embed.addFields(fields)

      const messageHandler = indexParser(season.episodes.length, (index) => {
        navigation.navigate(displays.episode(navigation, season.episodes[index - 1]))
      })

      return {
        embed,
        messageHandler,
      }
    },
    async episode(navigation, episode) {
      const embed = new MessageEmbed()

      embed.setTitle(episode.fullTitle)
      embed.setDescription(episode.plot)
      let torrents = await piratebay.getTorrents({
        q: episode.fullTitle,
        cat: piratebay.categories.video,
      })
      torrents.sort((a, b) => b.seeds - a.seeds).slice(0, 10)
      torrents.forEach((torrent, index) => torrent.index = index + 1)
      const fields = buildEmbedMessageFields(torrents, ['index', 'title', 'size'])
      embed.addFields(fields)

      const messageHandler = indexParser(torrents.length, async (index) => {
        const torrent = torrents[index - 1]
        await open(torrent.magnet)
      })


      return {
        embed,
        messageHandler
      }
    }
  }

  const commands = {
    async search(msg, ...args) {
      const title = args.join(' ')
      let { results: series } = await imdb.get('searchSeries', title)
      series = series.slice(0, indexes.length)
      const navigationMessage = new NavigationMessage(bot)
      const display = displays.search(navigationMessage, series)
      await navigationMessage.start(msg.channel, display)
    }
  }

  bot.on('messageCreate', async (msg) => {
    if (!msg.content.startsWith(PROGRAM))
      return
    const [, commandName, ...args] = msg.content.replace(PROGRAM, '').split(' ')
    if (commands[commandName]) {
      await commands[commandName](msg, ...args)
    }
  })
}