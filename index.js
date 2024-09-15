import CoreModule from 'sools-core-server/CoreModule'
import config  from './config/index.js'
import src from './src/index.js'

const start = async () => {
  const core = new CoreModule({
    config,
    modules: [
      src,
    ]
  })

  await core.start()
  console.log('geptyro-bot started')
  return core
}

start()
  .catch((err) => {
    if (err.detail) {
      console.error(JSON.stringify(err.detail, null, ' '))
      console.error(err)
    } else {
      console.error(err)
    }
  })
