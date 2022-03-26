const Modulation = require('./Modulation')

module.exports = class Factory extends Modulation {
  getAsDependency(module) {
    return this.module.self(module)
  }
}
