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
    console.log("__ready__")
  } catch (e) {
    console.error(e)
    process.exit()
  }

}


start()