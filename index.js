require('./setup')
const CoreModule = require('sools-core-server/CoreModule')
const config = require('./config')

const start = async () => {
  const core = new CoreModule({
    config,
    dependencies: [
      require('sools-core-server'),
      require('sools-migrations'),
      require('sools-mongo'),
      require('sools-modeling-server'),
    ]
  })

  await core.start()
  console.log('PURGE START')
  await core.object.trigger('purge')
  console.log('PURGE END')
  console.log('MIGRATE START')
  await core.object.trigger('migrate')
  console.log('MIGRATE END')
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
