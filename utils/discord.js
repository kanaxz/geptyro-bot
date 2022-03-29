
const deleteAllMessagesOfChannel = async (channel) => {
  let messages
  do {
    messages = await channel.messages.fetch({})
    for (const [, message] of messages) {
      await message.delete(1000)
    }
  } while (messages.length)
}

const deleteLastMessagesOfChannel = async (channel, count) => {
  let messages
  do {
    messages = await channel.messages.fetch({})
    for (const [, message] of messages) {
      if (count-- < 0)
        continue
      await message.delete(1000)
    }
  } while (count > 0 && messages.length)
}

const buildEmbedMessageFields = (array, fields) => {
  if (!fields)
    fields = Object.keys(array[0])
  return fields.map((fieldName) => {
    return {
      name: fieldName,
      value: array.map((item) => item[fieldName]).join('\n'),
      inline: true,
    }
  })
}

const tryDeleteMessage = (msg) => {
  setTimeout(async () => {
    try {
      await msg.delete()
    } catch (e) {

    }
  }, 1000)
}

module.exports = {
  deleteAllMessagesOfChannel,
  buildEmbedMessageFields,
  tryDeleteMessage,
  deleteLastMessagesOfChannel,
}