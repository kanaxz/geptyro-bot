
module.exports = class Modulation {

  constructor(initFunction) {
    this.initFunction = initFunction
  }

  getAsDependency(module) {
    return this.module.self
  }
}