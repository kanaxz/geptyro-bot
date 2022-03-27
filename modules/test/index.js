const { deleteAllMessagesOfChannel } = require('../../utils/discord')

module.exports = async ({ bot, piratebay }) => {
  const channel = bot.channels.cache.find(channel => channel.name === 'test')
  await deleteAllMessagesOfChannel(channel)

  /*
  const torrents = await piratebay.getTorrents({
    q: 'halo S01E01',
    cat:piratebay.categories.video
  })

  console.log(torrents.sort((a, b) => b.seeds - a.seeds).slice(0, 5))
  /**/
}