const Module = require('./Module')

const global = new Module({
  name: 'global',
  self: {},
  path: './',
  level: 0,
  initFunction: () => { }
})

const start = async () => {
  await global.init()
  global.printTree()
}


start()