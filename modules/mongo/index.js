const mongo = require('mongodb')

module.exports = async ({ config }) => {  
  const client = await mongo.MongoClient.connect(config.mongo.url, {
    useUnifiedTopology: true
  })

  const db = client.db(config.mongo.db)
  return db
}