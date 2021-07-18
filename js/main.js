const Main = (function() {

    const CANVAS_WIDTH = 630
    const CANVAS_HEIGHT = 891

    let bindings
    let observables
    let settings
    let settingsData = {
        N: 30,
        shortLines: true,
        landscapeMode: false
    }
    let cancelListeners = []

    async function start() {
        bindings = bind()
        settings = Settings(bindings.settingsModal)
        observables = createObservables(bindings)
        setListeners(bindings, observables)
        retry()
    }

    function cancelCurrentDrawing() {
        cancelListeners.forEach(f => f())
        cancelListeners = []
    }

    function retry() {
        drawingLoop(bindings, observables, settingsData, f => cancelListeners.push(f))
    }

    function bind() {
        return {
            canvas: document.querySelector('canvas'),
            settings: document.getElementById('settings'),
            settingsModal: document.getElementById('settings-modal'),
            messages: document.querySelector('.messages')
        }
    }

    function setListeners(bindings, observables) {
        bindings.settings.addEventListener('click', () => {
            settings.open(settingsData, newSettingsData => {
                settingsData = newSettingsData
                cancelCurrentDrawing()
                retry()
            })
        })
    }

    function createObservables(bindings) {
        const { fromEvent, merge, concat, of } = rxjs
        const { flatMap, takeUntil } = rxjs.operators

        const down = fromEvent(bindings.canvas, 'pointerdown')
        const up = fromEvent(bindings.canvas, 'pointerup')
        const out = fromEvent(bindings.canvas, 'pointerout')
        const upOrOut = merge(up, out)
        const move = fromEvent(bindings.canvas, 'pointermove')
        

        const line = down.pipe(
            flatMap(e => concat(
                move.pipe(takeUntil(upOrOut)),
                of('EOL')
            ))
        )

        return {
            line
        }
    }

    function captureLine(bindings, observables, onCancel) {
        return new Promise((resolve, reject) => {
            const canvas = Canvas(bindings.canvas)
            let points = []
            const sub = observables.line.subscribe(
                e => {
                    if (e === 'EOL') {
                        sub.unsubscribe()
                        resolve(points)
                        return
                    }

                    const { x, y } = canvas.getMousePosition(e)
                    if (points.length > 0) {
                        canvas.line(points[points.length - 1], { x, y })
                    }
                    points.push({ x, y })
                }
            )

            onCancel(() => {
                sub.unsubscribe()
                resolve(points)
            })
        })
    }

    function createReferenceLine(bindings, opts = {}) {
        const randomBetween = (a, b) => Math.floor(Math.random()*(b - a + 1) + a)
        const { M = 64, L = [0.25, 1] } = opts
        const [ w, h ] = [ bindings.canvas.width - 2*M, bindings.canvas.height - 2*M ]
        const [ startX, endX ] = [ M, bindings.canvas.width - M ]
        const [ startY, endY ] = [ M, bindings.canvas.height - M ]

        const lineY = opts.lineY !== undefined ? opts.lineY : randomBetween(startY, endY)
        const lineWidth = opts.lineWidth !== undefined ? opts.lineWidth : randomBetween(Math.floor(w*L[0]), Math.floor(w*L[1]))
        const lineOffsetX = opts.lineOffsetX !== undefined ? opts.lineOffsetX : startX + randomBetween(0, w - lineWidth)
        return { lineY, lineWidth, lineOffsetX }
    }

    // points need to be sorted by x position
    function findErrorPoint(points, target) {
        for (let rightIndex = 1; rightIndex < points.length; rightIndex++) {
            const leftIndex = rightIndex - 1
            const left = points[leftIndex]
            const right = points[rightIndex]
            if (left.x > target.x) continue
            if (right.x < target.x) continue
            
            const m = (right.y - left.y)/(right.x - left.x)
            const b = right.y - m*right.x
            const y = m*target.x + b
            return { x: target.x, y }
        }
        return undefined
    }

    function calculateStats(data) {
        if (data.length === 0) return [Infinity, Infinity, Infinity]
        let min = Infinity
        let max = -Infinity
        let accum = 0
        for (let i = 0; i < data.length; i++) {
            min = Math.min(min, data[i])
            max = Math.max(max, data[i])
            accum += data[i]
        }
        return [min, accum/data.length, max]
    }

    const isBronzeAttempt = attempt => attempt.errorValues.control <= 10 && attempt.errorValues.accuracy <= 2.0
    const isSilverAttempt = attempt => attempt.errorValues.control <= 8 && attempt.errorValues.accuracy <= 1.5
    const isGoldAttempt = attempt => attempt.errorValues.control <= 6 && attempt.errorValues.accuracy <= 1.0

    function drawStar(bindings, attempt, opts = {}) {
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

    function drawSummary(bindings, attempts, opts = {}) {
        const validAttempts = attempts.filter(attempt => attempt.errorValues !== undefined)
        const invalidLines = attempts.length - validAttempts.length
        const controlStats = calculateStats(validAttempts.map(a => a.errorValues.control))
        const accuracyStats = calculateStats(validAttempts.map(a => a.errorValues.accuracy))
        const bronzeStars = validAttempts.filter(a => isBronzeAttempt(a) && !isSilverAttempt(a)).length
        const silverStars = validAttempts.filter(a => isSilverAttempt(a) && !isGoldAttempt(a)).length
        const goldStarsStars = validAttempts.filter(a => isGoldAttempt(a)).length

        let bestControlAvg = controlStats[1]
        let newControlAvgBest = true
        if (localStorage.getItem('bestControlAvg')) {
            let parsed = parseFloat(localStorage.getItem('bestControlAvg'))
            newControlAvgBest = controlStats[1] < parsed
            bestControlAvg = Math.min(parsed, bestControlAvg)
        }
        localStorage.setItem('bestControlAvg', bestControlAvg)

        let bestAccuracyAvg = accuracyStats[1]
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

    function calculateErrorLines(referenceLine, lineDrawn, opts = {}) {
        const { accuracyErrorJump = 5 } = opts
        const { lineY, lineWidth, lineOffsetX } = referenceLine
        const leftMost = lineDrawn.reduce((({ x:x1, y:y1 }, { x:x2, y:y2 }) => x1 <= x2 ? ({ x: x1, y: y1 }) : ({ x: x2, y: y2 })), { x: Infinity, y:0 })
        const rightMost = lineDrawn.reduce((({ x:x1, y:y1 }, { x:x2, y:y2 }) => x1 >= x2 ? ({ x: x1, y: y1 }) : ({ x: x2, y: y2 })), { x: -Infinity, y:0 })

        const control = {
            left: [lineOffsetX, leftMost.x, lineY],
            right: [lineOffsetX + lineWidth, rightMost.x, lineY]
        }

        const sortedLineDrawn = [...lineDrawn]
        sortedLineDrawn.sort((a, b) => a.x - b.x)

        const accuracy = []
        for (let i = 0; lineOffsetX + i*accuracyErrorJump <= lineOffsetX + lineWidth; i++) {
            const x = lineOffsetX + i*accuracyErrorJump
            const y = lineY
            const errorPoint = findErrorPoint(sortedLineDrawn, { x, y })
            if (errorPoint) {
                accuracy.push([x, y, errorPoint.y - y])
            }
        }

        return {
            control,
            accuracy
        }
    }

    function calculateErrorValues(errorLines) {
        const { control:controlLines, accuracy:accuracyLines } = errorLines

        const { left, right } = controlLines
        const control = Math.abs(left[0] - left[1]) + Math.abs(right[0] - right[1])

        const accuracy = accuracyLines
        .map(aLine => Math.abs(aLine[2]))
        .filter(x => !isNaN(x))
        .reduce((a, b) => a + b, 0)/accuracyLines.length

        return {
            control,
            accuracy
        }
    }

    function drawingLoop(bindings, observables, opts = {}, onCancel) {
        const { N = 30, M = 32, innerOffset = 24, shortLines, landscapeMode } = opts

        let keepRunning = true
        onCancel(() => {
            keepRunning = false
        })

        if (landscapeMode) {
            bindings.canvas.width = CANVAS_HEIGHT
            bindings.canvas.height = CANVAS_WIDTH
        } else {
            bindings.canvas.width = CANVAS_WIDTH
            bindings.canvas.height = CANVAS_HEIGHT
        }

        const runDrawingLoop = async () => {
            const canvas = Canvas(bindings.canvas)
            const jump = Math.floor((bindings.canvas.height - 2*M - 2 * innerOffset) / (N - 1))
            const attempts = []
            for(let i = 0; i < N; i++) {
                // Clear
                canvas.clear()
                bindings.messages.innerHTML = ''

                // Draw margins
                canvas.line({ x: M, y: M }, { x: bindings.canvas.width - M, y: M }, opts = { lineColor: 'rgba(0,0,0,0.3)' })
                canvas.line({ x: M, y: M }, { x: M, y: bindings.canvas.height - M }, opts = { lineColor: 'rgba(0,0,0,0.3)' })
                canvas.line({ x: bindings.canvas.width/2, y: M }, { x: bindings.canvas.width/2, y: bindings.canvas.height - M }, opts = { lineColor: 'rgba(0,0,0,0.3)' })
                canvas.line({ x: bindings.canvas.width - M, y: M }, { x: bindings.canvas.width - M, y: bindings.canvas.height - M }, opts = { lineColor: 'rgba(0,0,0,0.3)' })
                canvas.line({ x: M, y: bindings.canvas.height - M }, { x: bindings.canvas.width - M, y: bindings.canvas.height - M }, opts = { lineColor: 'rgba(0,0,0,0.3)' })

                // Draw past attempts
                for (let j = 0; j < attempts.length; j++) {
                    drawAttempt(bindings, attempts[j])
                }

                // Draw current reference line
                const lineWidthModifier = shortLines ? 2 : 1
                const referenceLine = createReferenceLine(bindings, { ...opts, lineY: M + innerOffset + i*jump, lineOffsetX: M, lineWidth: (bindings.canvas.width - 2*M)/lineWidthModifier })
                const { lineY, lineWidth, lineOffsetX } = referenceLine
                canvas.line({ x: lineOffsetX, y: lineY }, { x: lineOffsetX + lineWidth, y: lineY }, { lineColor: 'rgba(0, 0, 255, 0.3)' })

                // Capture line
                const lineDrawn = await captureLine(bindings, observables, onCancel)
                if (!keepRunning) return;

                // Calculate error
                let errorLines
                let errorValues
                if (lineDrawn.length >= 5) {
                    // calculate error only if the line drawn contains at least a few points
                    errorLines = calculateErrorLines(referenceLine, lineDrawn)
                    errorValues = calculateErrorValues(errorLines)
                }

                // Push and draw current attempt
                attempts.push({
                    referenceLine,
                    lineDrawn,
                    errorLines,
                    errorValues
                })

                drawAttempt(bindings, attempts[attempts.length - 1])
            }

            // Summary
            drawSummary(bindings, attempts)

            const rect = bindings.canvas.getBoundingClientRect()
            const style = `left: ${rect.x + bindings.canvas.width - 64}px; top: ${rect.y + bindings.canvas.height + 16}px; position: absolute;`
            bindings.messages.innerHTML += (
                `<button class='unselectable' style='${style}' onclick='Main.retry()'>retry</button>`
            )
        }
        runDrawingLoop()
    }

    return {
        start,
        retry
    }
})()

window.addEventListener('load', Main.start)