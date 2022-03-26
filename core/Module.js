const Self = require('./Self')
const fs = require('fs');
const { getParamNames } = require('../utils/meta');
const Modulation = require('./Modulation')

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
    return this.parent && this.parent.modules[moduleName] || this.parent && this.parent.findModule(moduleName)
  }

  async init() {

    if (this.isInitialized) {
      return
    }
    let paramNames = getParamNames(this.modulation.initFunction)
    let dependenciesNames
    let addSelfArg = true
    if (paramNames.length === 2) {
      dependenciesNames = paramNames[1]
    } else if (paramNames.length) {
      if (!(paramNames[0] instanceof Array)) {
        dependenciesNames = []
      } else {
        addSelfArg = false
        dependenciesNames = paramNames[0]
      }
    }
    if (!(dependenciesNames instanceof Array)) {
      dependenciesNames = []
    }
    for (const dependencyName of dependenciesNames) {
      const dependency = this.findModule(dependencyName)
      await dependency.init()
    }
    const dependencies = {}
    for (const dependencyName of dependenciesNames) {
      const dependency = this.findModule(dependencyName)
      dependencies[dependency.name] = await dependency.modulation.getAsDependency(this)
    }


    const args = [addSelfArg && this.self, dependencies].filter(arg => arg)
    const newSelf = await this.modulation.initFunction(...args)
    if (newSelf) {
      this.self = newSelf
    }
    this.isInitialized = true
    await this.initModules()
    if (this.self.childrenModulesInitialized) {
      this.self.childrenModulesInitialized()
    }
  }

  async initModules() {
    if (!this.isDirectory) {
      return
    }
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

      if (this.modules[module.name] || this.findModule(module.name)) {
        throw new Error(`Module name '${module.name}' already taken`)
      }

      const stat = fs.statSync(module.path)
      if (stat.isDirectory()) {
        if (!fs.existsSync(`${module.path}/index.js`)) {
          continue
        }
        module.isDirectory = true
      }

      this.modules[module.name] = module
      let modulation = require(module.path)
      if (!(modulation instanceof Modulation)) {
        modulation = new Modulation(modulation)
      }
      module.modulation = modulation
      module.modulation.module = module
    }

    for (const moduleName in this.modules) {
      await this.modules[moduleName].init()
    }
  }
}