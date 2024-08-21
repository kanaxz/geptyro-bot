require('./setup')
const CoreModule = require('sools-core-server/CoreModule')
const config = require('./config')

const start = async () => {
  const core = new CoreModule({
    config,
    modules: [
      require('./src'),
    ]
  })

  await core.start()
  await core.object.trigger('purge')
  await core.object.trigger('migrate')
  return core
}

module.exports = start()
  .catch((err) => {
    if (err.detail) {
      console.error(JSON.stringify(err.detail, null, ' '))
      console.error(err)
    } else {
      console.error(err)
    }
  })
