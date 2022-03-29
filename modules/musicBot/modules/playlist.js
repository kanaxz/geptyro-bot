
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
    if (self.currentIndex >= playlist.length) {
      self.currentIndex = 0
    }
    change(self.current())
  })

  self.previous = self.event('previous', () => {
    self.currentIndex--
    if (self.currentIndex < 0) {
      self.currentIndex = playlist.length - 1
    }
    change(self.current())
  })

  self.current = () => {
    return playlist[self.currentIndex]
  }

  self.removeAtIndex = (index) => {
    if (index > playlist.length - 1 || index < 0)
      throw new Error()
    const music = playlist[index]
    playlist.splice(index, 1)
    if (index < self.currentIndex)
      self.currentIndex--
    if (self.currentIndex >= playlist.length && playlist.length) {
      self.currentIndex--
    }
    if (playlist.length) {
      change(self.current())
    } else {
      finish()
    }
    return music
  }

  self.pop = () => {
    if (state.repeat) {
      const current = self.current()
      self.next()
      return current
    }
    return self.removeAtIndex(self.currentIndex)
  }

  self.reset = self.event('reset', () => {
    while (playlist.length) {
      playlist.splice(0, 1)
    }
    self.repeat = false
    self.currentIndex = 0
  })
}
