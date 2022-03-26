const chain = (array, end, initialArgs) => {
  let index = 0
  const work = (...args) => {
    if (index < array.length) {
      return array[index++](work, ...args)
    } else {
      return end(...args)
    }
  }
  return work(...initialArgs)
}


module.exports = class Self {

  constructor() {
    this.events = {}
  }

  getter(propertyName, get) {
    Object.defineProperty(this, propertyName, {
      get,
    })
  }

  wrap(object, properties) {
    for (const propertyName of properties) {
      this.getter(propertyName, () => {
        let result = object[propertyName]
        if (typeof (result) === 'function')
          result = result.bind(object)
        return result
      })
    }
  }


  event(eventName, fn) {
    const event = []
    this.events[eventName] = event

    return async (...initialArgs) => {
      return await chain(event, (...finalArgs) => {
        return fn(...finalArgs)
      }, initialArgs)
    }
  }

  on(eventName, listener) {
    this.events[eventName].push(listener)
  }
}