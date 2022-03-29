module.exports = async ({ tvshows }) => {


  const updateTracked = async () => {
    const series = await tvshows.collection.find().toArray()
    for (const serie of series) {
      delete serie.seasons
      await tvshows.loadSeasons(serie)
      await tvshows.collection.updateOne({
        _id: serie._id
      }, {
        $set: serie
      })
    }
  }

  //await updateTracked()
}