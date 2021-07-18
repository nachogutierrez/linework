function Clock(clockEl) {

    let isRunning = false
    let startTime
    let intervalId

    function start() {
        if (isRunning) return
        isRunning = true
        startTime = new Date().getTime()
        intervalId = setInterval(function() {
            populateClock(new Date().getTime() - startTime)
        }, 10)
    }

    function stop() {
        isRunning = false
        if (intervalId) clearInterval(intervalId)
        intervalId = undefined
    }

    function reset() {
        isRunning = false
        if (intervalId) clearInterval(intervalId)
        intervalId = undefined
        populateClock(0)
    }

    function populateClock(timeMillis) {
        let remaining = timeMillis
        const mins = Math.floor(remaining/60000)
        remaining -= 60000*mins
        const secs = Math.floor(remaining/1000)
        remaining -= 1000*secs
        const millisStr = ("000" + remaining).slice(-3)
        const secondsStr = ("00" + secs).slice(-2)
        const minutesStr = ("00" + mins).slice(-2)
        const clockContent = `${minutesStr}:${secondsStr}:${millisStr}`
        clockEl.innerHTML = clockContent
    }

    reset()

    return {
        start,
        stop,
        reset
    }
}