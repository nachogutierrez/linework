const Draw = (function() {

    const { calculateStats } = Calculate

    const isBronzeAttempt = attempt => attempt.errorValues.control <= 10 && attempt.errorValues.accuracy <= 2.0
    const isSilverAttempt = attempt => attempt.errorValues.control <= 8 && attempt.errorValues.accuracy <= 1.5
    const isGoldAttempt = attempt => attempt.errorValues.control <= 6 && attempt.errorValues.accuracy <= 1.0

    /**
     * Maybe draws a star for this attempt, depending on the error values.
     */
    function drawStar(bindings, attempt) {
        let clazz = ''
        if (isGoldAttempt(attempt)) {
            clazz = 'gold-star'
        } else if (isSilverAttempt(attempt)) {
            clazz = 'silver-star'
        } else if (isBronzeAttempt(attempt)) {
            clazz = 'bronze-star'
        }

        if (clazz) {
            const rect = bindings.canvas.getBoundingClientRect()
            const { referenceLine } = attempt
            const { lineY } = referenceLine
            const style = `left: ${rect.x - 32}px; top: ${rect.y + lineY}px; position: absolute;`
            bindings.messages.innerHTML += `<img class='${clazz} unselectable' style='${style}'></img>`
        }
    }

    function drawAttempt(bindings, attempt, opts = {}) {
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
            const controlInfo = `<span><img class='unselectable' title='To keep this number low start as close to the starting point of the referece line as possible, and end your line as close to the ending point of the reference line as possible.' src='assets/info.png' width='16px' height='16px'></img></span>`
            const accuracyInfo = `<span><img class='unselectable' title='Keep your lines as close to the reference line as possible to keep this number low.' src='assets/info.png' width='16px' height='16px'></img></span>`
            bindings.messages.innerHTML += (
                `<div class='unselectable' style='${style}'>control: ${controlError}${controlInfo}, accuracy: ${accuracyError.toFixed(2)}${accuracyInfo}</div>`
            )
        } else {
            bindings.messages.innerHTML += (
                `<div class='unselectable' style='${style}'>Invalid line</div>`
            )
        }

        // Star
        if (attempt.errorValues) {
            drawStar(bindings, attempt)
        }
    }

    function drawSummary(bindings, attempts, opts = {}) {
        const validAttempts = attempts.filter(attempt => attempt.errorValues !== undefined)

        // Error stats
        const controlStats = calculateStats(validAttempts.map(a => a.errorValues.control))
        const accuracyStats = calculateStats(validAttempts.map(a => a.errorValues.accuracy))

        // Stars count
        const bronzeStars = validAttempts.filter(a => isBronzeAttempt(a) && !isSilverAttempt(a)).length
        const silverStars = validAttempts.filter(a => isSilverAttempt(a) && !isGoldAttempt(a)).length
        const goldStarsStars = validAttempts.filter(a => isGoldAttempt(a)).length

        const invalidLines = attempts.length - validAttempts.length

        // Assume current value is best, then compare with PB in storage
        let bestControlAvg = controlStats[1]
        // Flag to control whether the PB should be updated or not
        let newControlAvgBest = true
        if (localStorage.getItem('bestControlAvg')) {
            let parsed = parseFloat(localStorage.getItem('bestControlAvg'))
            newControlAvgBest = controlStats[1] < parsed
            bestControlAvg = Math.min(parsed, bestControlAvg)
        }
        localStorage.setItem('bestControlAvg', bestControlAvg)

        // Assume current value is best, then compare with PB in storage
        let bestAccuracyAvg = accuracyStats[1]
        // Flag to control whether the PB should be updated or not
        let newAccuracyAvgBest = true
        if (localStorage.getItem('bestAccuracyAvg')) {
            let parsed = parseFloat(localStorage.getItem('bestAccuracyAvg'))
            newAccuracyAvgBest = accuracyStats[1] < parsed
            bestAccuracyAvg = Math.min(parsed, bestAccuracyAvg)
        }
        localStorage.setItem('bestAccuracyAvg', bestAccuracyAvg)

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
            `<button class='retry-btn unselectable' style='${style}'>retry</button>`
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