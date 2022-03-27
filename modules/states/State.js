
module.exports = class State {
  constructor(values) {
    for (const p in values)
      this[p] = values[p]
  }

  setDefault(source) {
    for (const p in source) {
      if (this[p] == null) {
        this[p] = source[p]
      }
    }
  }
}