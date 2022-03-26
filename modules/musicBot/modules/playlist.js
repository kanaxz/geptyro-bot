
module.exports = (self, { musicBot }) => {
  const state = musicBot.state
  let playlist = []
  self.currentIndex = 0

  self.wrap(playlist, ['length', 'map', 'push'])

  const change = self.event('change', (music) => {
    return music
  })

  const finish = self.event('finish')

  self.next = self.event('next', () => {

    self.currentIndex++
    // should only happen if repeat = true
    if (self.currentIndex >= playlist.length) {
      self.currentIndex = 0
    }

    change(self.current())
  })

  self.previous = self.event('previous', () => {
    if (!self.canPrevious()) {
      throw new Error('Cannot go previous')
    }
    self.currentIndex--
    // should only happen if repeat = true

    if (self.currentIndex < 0) {
      self.currentIndex = playlist.length - 1
    }
    change(self.current())
  })

  self.current = () => {
    return playlist[self.currentIndex]
  }

  self.pop = () => {
    const current = self.current()
    if (state.repeat) {
      self.next()
      return current
    }
    playlist.splice(self.currentIndex, 1)
    if (self.currentIndex >= playlist.length && playlist.length) {
      self.currentIndex--
    }
    if (playlist.length) {
      change(self.current())
    } else {
      finish()
    }
    return current
  }

  self.reset = self.event('reset', () => {
    while (playlist.length) {
      playlist.splice(0, 1)
    }
    self.repeat = false
    self.currentIndex = 0
  })
}





