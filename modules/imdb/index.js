const axios = require('axios')

module.exports = async ({ config }) => {
  let keyIndex = 0
  const request = async (type, action, arg) => {
    console.log(config.imdbApiKeys[keyIndex])
    const url = `https://imdb-api.com/en/API/${action}/${config.imdbApiKeys[keyIndex]}/${arg || ''}`

    const result = await axios[type](url)
    if (result.data.errorMessage) {
      if (result.data.errorMessage.startsWith('Maximum usage') && keyIndex + 1 < config.imdbApiKeys.length) {
        keyIndex++
        return request(type, action, arg)
      }
      else
        throw new Error(`imdb: ${result.data.errorMessage}`)
    }
    return result.data
  }

  const post = (...args) => request('post', ...args)
  const get = (...args) => request('get', ...args)

  return {
    post,
    get,
  }

}