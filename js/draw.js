const Draw = (function() {

    const { calculateStats } = Calculate
    const { STORAGE } = Constants

    const getErrorScore = (starValues, errorValue) => {
        let i = starValues.findIndex(starValue => errorValue <= starValue)
        if (i < 0) return starValues.length
        else return i
    }
    const getAttemptErrorScore = (attempt, opts) => (
        Math.max(
            getErrorScore(opts.starValues.control, attempt.errorValues.control),
            getErrorScore(opts.starValues.accuracy, attempt.errorValues.accuracy)
        )
    )

    const isBronzeAttempt = (attempt, opts) => getAttemptErrorScore(attempt, opts) === 2
    const isSilverAttempt = (attempt, opts) => getAttemptErrorScore(attempt, opts) === 1
    const isGoldAttempt = (attempt, opts) => getAttemptErrorScore(attempt, opts) === 0

    /**
     * Maybe draws a star for this attempt, depending on the error values.
     */
    function drawStar(bindings, attempt, opts) {
        let clazz = ''
        if (isGoldAttempt(attempt, opts)) {
            clazz = 'gold-star'
        } else if (isSilverAttempt(attempt, opts)) {
            clazz = 'silver-star'
        } else if (isBronzeAttempt(attempt, opts)) {
            clazz = 'bronze-star'
        }

        if (clazz) {
            const rect = bindings.canvas.getBoundingClientRect()
            const { referenceLine } = attempt
            const { lineY } = referenceLine
            const style = `left: ${rect.x - 16}px; top: ${rect.y + lineY}px; position: absolute;`
            bindings.messages.innerHTML += `<img class='${clazz} unselectable' style='${style}'></img>`
        }
    }

    function drawAttempt(bindings, attempt, opts = {}) {
        const { COLOR } = Constants
        const { starValues } = opts
        const { referenceLine, lineDrawn } = attempt
        const { lineY, lineWidth, lineOffsetX } = referenceLine
        const canvas = Canvas(bindings.canvas)

        // Reference line
        canvas.line({ x: lineOffsetX, y: lineY }, { x: lineOffsetX + lineWidth, y: lineY }, { lineColor: 'rgba(0, 0, 255, 0.3)' })

        // Line drawn
        for(let i = 1; i < lineDrawn.length; i++) {
            canvas.line(lineDrawn[i-1], lineDrawn[i])
        }

        // Error lines
        if (attempt.errorLines) {
            const { control:controlLines, accuracy:accuracyLines } = attempt.errorLines
            canvas.line({ x: controlLines.left[0], y: controlLines.left[2] }, { x: controlLines.left[1], y: controlLines.left[2] }, { lineColor: 'red' })
            canvas.line({ x: controlLines.right[0], y: controlLines.right[2] }, { x: controlLines.right[1], y: controlLines.right[2] }, { lineColor: 'red' })

            for (let i = 0; i < accuracyLines.length; i++) {
                const [x, y, offset] = accuracyLines[i]
                canvas.line({ x, y }, { x, y: y + offset }, { ...opts, lineColor: 'red' })
            }
        }

        // Error values
        const rect = bindings.canvas.getBoundingClientRect()
        const style = `left: ${rect.x + bindings.canvas.width + 5}px; top: ${rect.y + lineY}px; transform: translateY(-50%); position: absolute;`
        if (attempt.errorValues) {
            const { control:controlError, accuracy:accuracyError } = attempt.errorValues
            const colors = [COLOR.GOLD, COLOR.SILVER, COLOR.BRONZE, COLOR.BLACK]
            const controlColor = colors[getErrorScore(starValues.control, controlError)]
            const accuracyColor = colors[getErrorScore(starValues.accuracy, accuracyError)]
            const controlInfo = `<span><img class='unselectable' title='To keep this number low start as close to the starting point of the referece line as possible, and end your line as close to the ending point of the reference line as possible.' src='assets/info.png' width='16px' height='16px'></img></span>`
            const accuracyInfo = `<span><img class='unselectable' title='Keep your lines as close to the reference line as possible to keep this number low.' src='assets/info.png' width='16px' height='16px'></img></span>`
            bindings.messages.innerHTML += (
                `<div class='unselectable' style='${style}'>control: <span style='color: ${controlColor}'>${controlError}</span>${controlInfo}, accuracy: <span style='color: ${accuracyColor}'>${accuracyError.toFixed(2)}</span>${accuracyInfo}</div>`
            )
        } else {
            bindings.messages.innerHTML += (
                `<div class='unselectable' style='${style}'>Invalid line</div>`
            )
        }

        // Star
        if (attempt.errorValues) {
            drawStar(bindings, attempt, opts)
        }
    }

    function drawSummary(bindings, attempts, opts = {}) {
        const validAttempts = attempts.filter(attempt => attempt.errorValues !== undefined)

        // Error stats
        const controlStats = calculateStats(validAttempts.map(a => a.errorValues.control))
        const accuracyStats = calculateStats(validAttempts.map(a => a.errorValues.accuracy))

        // Stars count
        const bronzeStars = validAttempts.filter(a => isBronzeAttempt(a, opts) && !isSilverAttempt(a, opts)).length
        const silverStars = validAttempts.filter(a => isSilverAttempt(a, opts) && !isGoldAttempt(a, opts)).length
        const goldStarsStars = validAttempts.filter(a => isGoldAttempt(a, opts)).length

        const invalidLines = attempts.length - validAttempts.length

        // Assume current value is best, then compare with PB in storage
        let bestControlAvg = controlStats[1]
        // Flag to control whether the PB should be updated or not
        let newControlAvgBest = true
        if (localStorage.getItem(STORAGE.BEST_CONTROL_AVG)) {
            let parsed = parseFloat(localStorage.getItem(STORAGE.BEST_CONTROL_AVG))
            newControlAvgBest = controlStats[1] < parsed
            bestControlAvg = Math.min(parsed, bestControlAvg)
        }
        if (!isNaN(bestControlAvg)) {
            localStorage.setItem(STORAGE.BEST_CONTROL_AVG, bestControlAvg)
        }

        // Assume current value is best, then compare with PB in storage
        let bestAccuracyAvg = accuracyStats[1]
        // Flag to control whether the PB should be updated or not
        let newAccuracyAvgBest = true
        if (localStorage.getItem(STORAGE.BEST_ACCURACY_AVG)) {
            let parsed = parseFloat(localStorage.getItem(STORAGE.BEST_ACCURACY_AVG))
            newAccuracyAvgBest = accuracyStats[1] < parsed
            bestAccuracyAvg = Math.min(parsed, bestAccuracyAvg)
        }
        if (!isNaN(bestAccuracyAvg)) {
            localStorage.setItem(STORAGE.BEST_ACCURACY_AVG, bestAccuracyAvg)
        }

        let summary
        if (validAttempts.length > 0) {
            summary = [
                `Control error. min: <b>${controlStats[0]}</b>, avg: <b>${controlStats[1].toFixed(2)}</b>, max: <b>${controlStats[2]}</b>, best avg: <b>${bestControlAvg.toFixed(2)}</b>${newAccuracyAvgBest?'(New best!)':''}`,
                `Accuracy error. min: <b>${accuracyStats[0].toFixed(2)}</b>, avg: <b>${accuracyStats[1].toFixed(2)}</b>, max: <b>${accuracyStats[2].toFixed(2)}</b>, best avg: <b>${bestAccuracyAvg.toFixed(2)}</b>${newAccuracyAvgBest?'(New best!)':''}`,
                `Stars. bronze: <b>${bronzeStars}</b>, silver: <b>${silverStars}</b>, gold: <b>${goldStarsStars}</b>`,
                `Invalid lines: <b>${invalidLines}</b>`
            ]
        } else {
            summary = [
                `Invalid lines: <b>${invalidLines}</b>`
            ]
        }
        const rect = bindings.canvas.getBoundingClientRect()
        for (let i = 0; i < summary.length; i++) {
            const style = `left: ${rect.x}px; top: ${rect.y + bindings.canvas.height + i*16}px; position: absolute;`
            bindings.messages.innerHTML += (
                `<div class='unselectable' style='${style}'>${summary[i]}</div>`
            )
        }
    }

    function drawRetryButton(drawingLoop, bindings, observables, opts, onCancel) {
        const rect = bindings.canvas.getBoundingClientRect()
        const style = `left: ${rect.x + bindings.canvas.width - 64}px; top: ${rect.y + bindings.canvas.height + 16}px; position: absolute;`
        bindings.messages.innerHTML += (
            `<div class='retry-btn unselectable button clickable' style='${style}'>retry</div>`
        )
        const retryButton = bindings.messages.querySelector('.retry-btn')
        retryButton.addEventListener('click', () => {
            drawingLoop(bindings, observables, opts, onCancel)
        })
    }

    return {
        drawStar,
        drawAttempt,
        drawSummary,
        drawRetryButton
    }
})()