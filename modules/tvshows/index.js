const doubleDigit = (number) => {
  number = number.toString()
  if (number.length === 1)
    number = '0' + number
  return number
}

module.exports = ({ mongo, imdb }) => {
  const collection = mongo.collection('tvshows')

  const getSerie = (imdbId) => {
    return collection.findOne({ imdbId })
  }

  const toggleTrackSerie = async (serie, userId) => {
    const deleteResult = await collection.deleteOne({
      imdbId: serie.id
    })
    if (deleteResult.deletedCount)
      return

    const serieDetails = await imdb.get('Title', serie.id)
    let seasons
    if (serieDetails.tvSeriesInfo) {
      seasons = []
      for (const seasonNumber of serieDetails.tvSeriesInfo.seasons) {
        const seasonDetails = await imdb.get('SeasonEpisodes', `${serie.id}/${seasonNumber}`)        
        const season = {
          index: seasonNumber,
          fullTitle: `${serie.title} S${doubleDigit(seasonNumber)}`,
          date: seasonDetails.episodes[0].released,
          count: seasonDetails.episodes.length,
          episodes: seasonDetails.episodes,
        }
        seasonDetails.episodes.forEach((episode) => {
          episode.index = episode.episodeNumber
          episode.fullTitle = `${season.fullTitle}E${doubleDigit(episode.episodeNumber)}`
        })

        seasons.push(season)
      }
    }

    const dbSerie = {
      title: serie.title,
      description: serie.description,
      imdbId: serie.id,
      seasons,
      userIds: [],
    }

    const { insertedId } = await collection.insertOne(dbSerie)
    dbSerie._id = insertedId
    return dbSerie
  }

  return {
    collection,
    getSerie,
    toggleTrackSerie,
  }
}