
module.exports = (self) => {

  let playlist = []
  self.currentIndex = 0

  self.canNext = () => {
    return playlist.length > self.currentIndex + 1
  }

  self.canPrevious = () => {
    return self.currentIndex - 1 >= 0
  }

  self.wrap(playlist, ['length', 'map', 'push'])

  const change = self.event('change', (music) => {
    return music
  })

  const finish = self.event('finish')

  self.next = self.event('next', () => {
    if (!self.canNext()) {
      throw new Error('Cannot go next')
    }

    change(playlist[++self.currentIndex])
  })

  self.previous = self.event('previous', () => {
    if (!self.canPrevious()) {
      throw new Error('Cannot go previous')
    }
    change(playlist[--self.currentIndex])
  })

  self.current = () => {
    return playlist[self.currentIndex]
  }

  self.pop = () => {
    const current = self.current()
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

    self.currentIndex = 0
  })
}





