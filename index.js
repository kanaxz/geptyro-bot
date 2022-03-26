const Module = require('./core/Module')

const global = new Module({
  name: 'global',
  self: {},
  path: __dirname,
  level: 0,
  isDirectory: true,
  modulation: {
    initFunction: () => { }
  }
})

const start = async () => {
  await global.init()
  global.printTree()
}


start()