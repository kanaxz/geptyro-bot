const private = require('./private')
const local = require('./local')
module.exports = () => {
  return {
    ...private,
    ...local,
  }
}