
const deleteAllMessagesOfChannel = async (channel) => {
  let messages
  do {
    messages = await channel.messages.fetch({})
    for (const [, message] of messages) {
      await message.delete(1000)
    }
  } while (messages.length)
}

module.exports = {
  deleteAllMessagesOfChannel,
}