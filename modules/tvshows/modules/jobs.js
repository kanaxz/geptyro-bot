
module.exports = ({ tvshows, scheduler, commands, youtube }) => {

  scheduler.addJob('tvshows:update', { 'all': [8] }, async () => {
    const cursor = await tvshows.collection.find({})
    while (await cursor.hasNext()) {
      const serie = await cursor.next()
      serie.seasons = null
      await tvshows.loadSeasons(serie)
      await tvshows.collection.update({
        _id: serie._id
      }, {
        $set: serie
      })
    }
  })

  scheduler.addJob('tvshows:week', { 'monday': [8] }, async () => {
    await commands.week(tvshows.channel, 0, true)
  })
  /**/

  scheduler.addJob('tvshows:day', { 'all': [8, 20] }, async () => {
    const episodes = await commands.day(tvshows.channel, 0, true)
    for (const episode of episodes) {
      if (episode.number !== 1)
        continue

      const { data: { items: [video] } } = await youtube.api.search.list({
        part: ['id'],
        maxResults: 1,
        type: ['video'],
        q: `${episode.season.getFullPath()} official trailer`
      })
      const videoUrl = youtube.buildUrl(video.id.videoId)
      await tvshows.channel.send(`${episode.season.getFullPath()} starting today ${videoUrl}`)
    }
  })
}