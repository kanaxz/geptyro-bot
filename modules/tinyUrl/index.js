const axios = require('axios')

module.exports = async ({ config }) => {

  const request = async (type, url, body) => {
    return await axios[type](`https://api.tinyurl.com${url}?api_token=${config.tinyUrlApiToken}`, body)
  }

  const create = async (url) => {
    const result = await request('post', '/create', {
      url,
    })
    return result.data.data
  }

  return {
    create,
  }
}