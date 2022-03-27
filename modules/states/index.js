const State = require('./State')
module.exports = ({ mongo }) => {
  const collection = mongo.collection('state')
  const get = async (moduleName) => {
    let state = await collection.findOne({
      moduleName
    })
    if (!state) {
      state = {
        moduleName,
      }
      const { insertedId } = await collection.insertOne(state)
      state._id = insertedId
    }

    state = new State(state)
    state.save = async () => {      
      await collection.updateOne({
        _id: state._id
      }, {
        $set: state
      })
    }
    return state
  }

  return {
    get,
  }
}