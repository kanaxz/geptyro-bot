const Module = require('./core/Module')

const global = new Module({
  name: 'global',
  self: {},
  path: __dirname,
  level: 0,
  isDirectory: true,
  initFunction: () => { }
})

const start = async () => {
  try {
    await global.init()
    //global.printTree()
  } catch (e) {
    console.error(e)
    process.exit()
  }

}


start()