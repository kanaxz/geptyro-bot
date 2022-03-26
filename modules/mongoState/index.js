const Factory = require('../../core/Factory')
const State = require('./State')
module.exports = new Factory(({ mongo }) => {
  const collection = mongo.collection('state')
  return async (module) => {
    let state = await collection.findOne({
      moduleName: module.name
    })
    if (!state) {
      state = {
        moduleName: module.name,
      }
      const { insertedId } = await collection.insertOne(state)
      state._id = insertedId
    }
    return new State(collection, state)
  }
})