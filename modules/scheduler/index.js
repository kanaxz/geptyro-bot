const moment = require('moment')

const DAYS = moment.weekdays().map((d) => d.toLocaleLowerCase())

module.exports = async ({ states }) => {
  const state = await states.get('scheduler')
  state.setDefault({
    executions: {}
  })
  const jobs = []
  const addJob = (name, timer, fn) => {
    jobs.push({
      name,
      timer,
      fn,
    })
  }

  const executeJob = async (job) => {
    let error
    try {
      await job.fn()
    } catch (e) {
      error = e
      console.error(e)
    }
    state.executions[job.name] = {
      success: !error,
      date: new Date(),
      error: error && error.message
    }

    state.save()
  }

  const getLastDate = (timer) => {
    const now = moment.utc(moment()).startOf('day')
    if (timer.all) {
      for (const day of DAYS)
        timer[day] = timer.all
      delete timer.all
    }
    let currentDate = now.clone()
    do {

      let dayTimer = timer[currentDate.format('dddd').toLocaleLowerCase()]
      if (dayTimer) {
        dayTimer = dayTimer.sort((a, b) => b - a)
        for (const hour of dayTimer) {
          currentDate.set('hour', hour)
          if (currentDate.toDate() < now.toDate())
            return currentDate.toDate()
        }
      }

      currentDate = currentDate.add(-1, 'days')
    } while (currentDate.weekday() !== now.weekday())
    throw new Error('Could not find last date')
  }

  const shouldExecuteJob = (job) => {
    let lastExecution = state.executions[job.name]
    const lastDate = getLastDate(job.timer)
    return !lastExecution || lastDate > lastExecution.date
  }

  const jobsLoop = () => {
    for (const job of jobs) {
      if (shouldExecuteJob(job)) {
        executeJob(job)
      }
    }
  }

  const start = () => {
    jobsLoop()
    setInterval(jobsLoop, 1000 * 60 * 60)
  }


  const ready = () => {
    start()
  }

  return {
    ready,
    addJob,
  }
}