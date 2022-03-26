const Module = require('./Module')

const global = new Module({
  name: 'global',
  self: {},
  path: './',
  level: 0,
  initFunction: () => { }
})

global.init()

