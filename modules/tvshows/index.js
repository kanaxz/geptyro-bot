const moment = require('moment')
const months = moment.monthsShort()


const doubleDigit = (number) => {
  number = number.toString()
  if (number.length === 1)
    number = '0' + number
  return number
}

const parseDate = (date) => {
  const split = date.split(' ')
  console.log(date)
  if (split.length !== 3)
    return null
  return moment.utc(`${split[0]}/${months.indexOf(split[1].replace('.', '')) + 1}/${split[2]}`, 'DD/MM/YYYY').toDate()
}

module.exports = async ({ mongo, imdb, bot }) => {
  const collection = mongo.collection('tvshows')

  const getSerie = (imdbId) => {
    return collection.findOne({ imdbId })
  }

  const channel = bot.channels.cache.find(channel => channel.name === 'tv-shows')

  const imdbToDb = (serie) => ({
    title: serie.title,
    description: serie.description,
    imdbId: serie.id,
    userIds: [],
  })

  const toggleTrackSerie = async (serie, userId) => {
    if (!serie._id) {
      await loadSeasons(serie)
      const { insertedId } = await collection.insertOne(serie)
      serie._id = insertedId
    }
    const userTrackingIndex = serie.userIds.indexOf(userId)
    if (userTrackingIndex !== -1) {
      serie.userIds.splice(userTrackingIndex, 1)
    } else {
      serie.userIds.push(userId)
    }

    if (!serie.userIds.length) {
      await collection.deleteOne({
        _id: serie._id
      })
      serie._id = null
    }
  }

  const getSeries = async () => {
    const series = await collection.find().toArray()
    return series
  }

  const search = async (title) => {
    let { results: series } = await imdb.get('searchSeries', title)
    const dbSeries = await collection.find({
      imdbId: {
        $in: series.map((s) => s.id)
      }
    }).toArray()

    series = series.map((serie) => {
      const dbSerie = dbSeries.find((s) => s.imdbId === serie.id)
      if (dbSerie)
        return dbSerie
      return imdbToDb(serie)
    })
    return series
  }

  const loadSeasons = async (serie) => {
    if (serie.seasons)
      return serie.seasons

    const serieDetails = await imdb.get('Title', serie.imdbId)
    let seasons
    if (serieDetails.tvSeriesInfo) {
      seasons = []
      for (const seasonNumber of serieDetails.tvSeriesInfo.seasons) {
        const seasonDetails = await imdb.get('SeasonEpisodes', `${serie.imdbId}/${seasonNumber}`)
        const season = {
          index: seasonNumber,
          fullTitle: `${serie.title} S${doubleDigit(seasonNumber)}`,
          date: seasonDetails.episodes[0].released,
          count: seasonDetails.episodes.length,
          episodes: seasonDetails.episodes,
        }
        seasonDetails.episodes.forEach((episode) => {
          episode.index = episode.episodeNumber
          episode.releasedBeautified = episode.released
          episode.released = parseDate(episode.released)
          episode.fullTitle = `${season.fullTitle}E${doubleDigit(episode.episodeNumber)}`
        })

        seasons.push(season)
      }
    }

    serie.seasons = seasons
    return seasons
  }

  const operators = {
    gt(value1, value2) {
      return value1 > value2
    },
    lt(value1, value2) {
      return value1 < value2
    },
    eq(value1, value2) {
      return value1 == value2
    }
  }

  const matchFilters = (value, filters) => {
    if (typeof filters !== 'object') {
      return operators.eq(value, filters)
    }

    for (const propertyName in filters) {
      if (!propertyName.startsWith('$')) {
        if (!matchFilters(value[propertyName], filters[propertyName])) {
          return false
        }
      } else if (!operators[propertyName.replace('$', '')](value, filters[propertyName])) {
        return false
      }
    }
    return true
  }

  const episodes = async (filters) => {
    console.log(filters)
    const series = await collection.find({
      seasons: {
        $elemMatch: {
          episodes: {
            $elemMatch: filters
          }
        }
      }
    }).toArray()

    return series
      .reduce((acc, serie) => {
        for (const season of serie.seasons) {
          for (const episode of season.episodes) {
            if (matchFilters(episode, filters)) {
              acc.push(episode)
            }
          }
        }
        return acc
      }, [])
      .sort((e1, e2) => e1.released - e2.released)
  }

  return {
    collection,
    getSerie,
    loadSeasons,
    toggleTrackSerie,
    getSeries,
    search,
    episodes,
    channel,
  }
}