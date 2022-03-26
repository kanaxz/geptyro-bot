const Self = require('./Self')
const fs = require('fs');
const { getParamNames } = require('./utils/meta')

module.exports = class Module {

  constructor(values) {
    this.isInitialized = false
    this.self = new Self()
    for (const p in values)
      this[p] = values[p]
  }

  printTree() {
    if (!this.level) {
      console.log('TREE')
    }
    console.log(' '.repeat(this.level * 2), this.name)
    for (const moduleName in this.modules) {
      this.modules[moduleName].printTree()
    }
  }

  findModule(moduleName) {
    if (this.name === moduleName) {
      return this
    }
    return this.parent.modules[moduleName] || this.parent && this.parent.findModule(moduleName)
  }

  async init() {

    if (this.isInitialized) {
      return
    }
    let [, dependenciesNames] = getParamNames(this.initFunction)
    if (!(dependenciesNames instanceof Array)) {
      dependenciesNames = []
    }
    for (const dependencyName of dependenciesNames) {
      const dependency = this.findModule(dependencyName)
      await dependency.init()
    }
    const dependencies = dependenciesNames.reduce((acc, dependencyName) => {
      const dependency = this.findModule(dependencyName)
      acc[dependencyName] = dependency.self
      return acc
    }, {})
    const newSelf = await this.initFunction(this.self, dependencies)
    if (newSelf) {
      this.self = newSelf
    }
    this.isInitialized = true
    await this.initModules()
  }

  async initModules() {
    this.modules = {}
    const modulesPath = `${this.path}/modules`
    if (!fs.existsSync(modulesPath)) {
      return
    }
    const files = fs.readdirSync(modulesPath)
    for (const file of files) {
      const module = new Module({
        name: file.replace('.js', ''),
        path: `${modulesPath}/${file}`,
        parent: this,
        level: this.level + 1,
      })

      const stat = fs.statSync(module.path)
      if (stat.isDirectory()) {
        if (!fs.existsSync(`${module.path}/index.js`)) {
          continue
        }
        module.isDirectory = true
      }

      this.modules[module.name] = module
      module.initFunction = require(module.path)
    }

    for (const moduleName in this.modules) {
      await this.modules[moduleName].init()
    }
  }
}