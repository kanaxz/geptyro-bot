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

  constructor(module) {
    this.events = {}
    this.module = module    
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
    if (!fn) {
      fn = (arg) => arg
    }
    return (...initialArgs) => {
      return chain(event, fn, initialArgs)
    }
  }

  on(eventName, listener) {
    this.events[eventName].push(listener)
  }

  after(eventName, listener) {
    this.on(eventName, async (next, ...args) => {
      const result = await next(...args)
      listener(result)
      return result
    })
  }

  before(eventName, listener) {
    this.on(eventName, (next, ...args) => {
      listener(...args)
      return next(...args)
    })
  }
}