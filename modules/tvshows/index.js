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
  if (split.length !== 3)
    return null
  return moment.utc(`${split[0]}/${months.indexOf(split[1].replace('.', '')) + 1}/${split[2]}`, 'DD/MM/YYYY').toDate()
}

const schemas = {
  episode: {
    methods: {
      getFullPath() {
        return `${this.season.getFullPath()}E${doubleDigit(this.number)}`
      }
    }
  },
  season: {
    methods: {
      getFullPath() {
        return `${this.serie.title} S${doubleDigit(this.number)}`
      }
    },
    properties: {
      episodes: {
        type: 'array',
        with: 'episode',
        on: 'season'
      }
    }
  },
  serie: {
    properties: {
      seasons: {
        type: 'array',
        with: 'season',
        on: 'serie'
      }
    }
  }
}

class Model {
  constructor(values) {
    for (const p in values)
      this[p] = values[p]
  }
}

for (const schemaName in schemas) {
  schema = schemas[schemaName]
  let methods = schema.methods
  if (!methods)
    methods = {}
  const classContainer = {
    [schemaName]: class extends Model { }
  }
  const prototype = classContainer[schemaName]
  for (const methodName in methods) {
    prototype.prototype[methodName] = methods[methodName]
  }

  schema.class = prototype
}

const Types = {
  array: {
    hydrate(instance, property, value) {
      return value.map((sub) => {
        const subInstance = hydrate(property.with, {
          ...sub,
          [property.on]: instance
        })
        return subInstance
      })
    },
    dehydrate(clone, property, value) {
      return value.map((sub) => {
        const clone = dehydrate(property.with, sub)
        delete clone[property.on]
        return clone
      })
    }
  }
}

const hydrate = (schemaName, object) => {

  const schema = schemas[schemaName]
  const instance = new schema.class(object)
  for (const propertyName in schema.properties) {
    const property = schema.properties[propertyName]
    const value = instance[propertyName]
    instance[propertyName] = Types[property.type].hydrate(instance, property, value)
  }
  return instance
}


const dehydrate = (schemaName, object) => {
  const schema = schemas[schemaName]
  const clone = { ...object }
  for (const propertyName in schema) {
    const property = schema[propertyName]
    const value = clone[propertyName]
    clone[propertyName] = Types[property.type].dehydrate(clone, property, value)
  }
  return clone
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
    } else if (serie.userIds.length > 1) {
      await collection.updateOne({
        _id: serie._id,
      }, {
        $set: dehydrate('serie', serie)
      })
    }
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
          number: parseInt(seasonNumber),
          date: seasonDetails.episodes[0].released,
          episodes: seasonDetails.episodes.map((episode) => {
            const newEpisode = {
              ...episode,
              releasedBeautified: episode.released,
              released: parseDate(episode.released),
              number: parseInt(episode.episodeNumber),
            }
            for (const p of ['seasonNupmber', 'episodeNumber', 'year', 'episodeNumber'])
              delete newEpisode[p]
            return newEpisode
          }),
        }

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
    lte(value1, value2) {
      return value1 <= value2
    },
    gte(value1, value2) {
      return value1 >= value2
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

  const getSeries = async (filters) => {
    const series = await collection.find(filters).toArray()
    return series.map((serie) => hydrate('serie', serie))
  }

  const getEpisodes = async (filters) => {

    const series = await getSeries({
      seasons: {
        $elemMatch: {
          episodes: {
            $elemMatch: filters
          }
        }
      }
    })
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
    getEpisodes,
    channel,
  }
}