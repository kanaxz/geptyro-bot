module.exports = class Playlist extends Array {
  constructor() {
    super()
    this.currentIndex = 0
  }

  canNext() {
    return this.length > this.currentIndex + 1
  }

  canPrevious() {
    return this.currentIndex - 1 >= 0
  }

  next() {
    if (!this.canNext()) {
      throw new Error('Cannot go next')
    }
    return this[++this.currentIndex]
  }

  previous() {
    if (!this.canPrevious()) {
      throw new Error('Cannot go previous')
    }
    return this[--this.currentIndex]
  }

  current() {
    return this[this.currentIndex]
  }

  endCurrent() {
    const current = this.current()
    this.splice(this.currentIndex, 1)
    if (this.currentIndex >= this.length && this.length) {
      this.currentIndex--
    }
    return current
  }
}