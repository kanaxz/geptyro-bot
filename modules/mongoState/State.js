
module.exports = class Config {
  constructor(collection, values) {
    this.collection = collection
    for (const p in values) {
      this[p] = values[p]
    }
  }

  async save() {
    const values = { ...this }
    delete values.collection
    await this.collection.updateOne({
      _id: this._id
    }, {
      $set: values
    })
  }

  setDefault(source) {
    for (const p in source) {
      if (this[p] == null) {
        this[p] = source[p]
      }
    }
  }
}