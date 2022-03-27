const axios = require('axios')

module.exports = async ({ config }) => {
  let keyIndex = 0
  const request = async (type, action, arg) => {
    const url = `https://imdb-api.com/en/API/${action}/${config.imdbApiKeys[keyIndex]}/${arg || ''}`
    //console.log(url)

    const result = await axios[type](url)
    if (result.data.errorMessage) {
      console.log(result.data.errorMessage)
      if (result.data.errorMessage.startsWith('Maximum usage') && keyIndex + 1 < config.imdbApiKeys.length) {
        keyIndex++
        return request(type, action, arg)
      }
      else
        throw new Error(result.data.errorMessage)
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