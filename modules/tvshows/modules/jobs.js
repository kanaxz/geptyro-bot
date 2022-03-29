
module.exports = ({ tvshows, scheduler, commands }) => {
  scheduler.addJob('tvshows:week', { 'all': [3, 8] }, async () => {
    console.log("here please")
    await commands.week(tvshows.channel, 0)
  })

  scheduler.addJob('tvshows:update', { 'all': [8] }, async () => {
    console.log("here please")
    await tvshows.collection.find({}).forEach(async (serie) => {
      serie.seasons = null
      await tvshows.loadSeasons(serie)
      await tvshows.collection.update({
        _id: serie._id
      }, {
        $set: serie
      })
    })
  })
}