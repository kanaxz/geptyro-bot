module.exports = class Timer {

  constructor() {
    this.start()
    this.pauseDate = this.startDate
  }

  start() {
    this.pauseDate = null
    this.pauseTime = 0
    this.startDate = new Date()
  }

  pause() {
    this.pauseDate = new Date()
  }

  resume() {
    this.pauseTime += new Date() - this.pauseDate
    this.pauseDate = null
  }

  duration() {
    return Math.floor(((this.pauseDate || new Date()) - this.startDate - this.pauseTime) / 1000)
  }
}