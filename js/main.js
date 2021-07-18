const Main = (function() {

    const { DEFAULT_SETTINGS, CANVAS_WIDTH, CANVAS_HEIGHT, LABEL_CANCEL_DRAWING } = Constants
    const { calculateErrorLines, calculateErrorValues } = Calculate
    const { drawAttempt, drawSummary, drawRetryButton } = Draw

    let settings
    let settingsData = DEFAULT_SETTINGS

    async function start() {
        bindings = bind()
        settings = Settings(bindings.settingsModal)
        observables = createObservables(bindings)
        setListeners(bindings, observables)
        drawingLoop(bindings, observables, settingsData, Notifier.subscribe(LABEL_CANCEL_DRAWING))
    }

    function bind() {
        return {
            canvas: document.querySelector('canvas'),
            settingsButton: document.getElementById('settings-btn'),
            settingsModal: document.querySelector('.modal'),
            messages: document.querySelector('.messages')
        }
    }

    function setListeners(bindings, observables) {
        bindings.settingsButton.addEventListener('click', () => {
            settings.open(settingsData, newSettingsData => {
                settingsData = newSettingsData
                Notifier.notify(LABEL_CANCEL_DRAWING)
                drawingLoop(bindings, observables, settingsData, Notifier.subscribe(LABEL_CANCEL_DRAWING))
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
        

        /**
         * The EOL value in the stream helps identify when
         * a line ends and the next one starts.
         */
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

    /**
     * Subscribes to the line observable. The Promise is resolved
     * as soon as the EOL value is emmited. The resolved value is
     * a list with all the points in the line drawn.
     * The line is drawn while the point values are emitted.
     * 
     * @param onCancel is a Notifier subscription function. it 
     *      helps make this Promise cancellable.
     */
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

    /**
     * Creates a line to use as reference. All parameters in its representation
     * can be overrided using the opts object.
     * Line representation:
     *      lineY: y-position of the line
     *      lineWidth: line width
     *      lineOffsetX: x-position of the left-end of the line.
     */
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

    /**
     * Iterates through the amount of lines that are to be drawn. Each cycle:
     *      1. Clear canvas and message container
     *      2. Draw paper margins.
     *      3. Draw past attempts
     *      4. Draw the current reference line
     *      5. Get a line drawn by the user by calling captureLine()
     *      6. Calculate error lines and values
     *      7. Save and draw the current attempt
     * After all lines are done, a summary of the session is added,
     * as well as a retry button.
     * 
     * @param {*} onCancel is a Notifier subscription function. it 
     *      helps make this Promise cancellable.
     */
    async function drawingLoop(bindings, observables, opts = {}, onCancel) {
        const { N, M, innerOffset, shortLines, landscapeMode } = opts

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

        const canvas = Canvas(bindings.canvas)
        const jump = Math.floor((bindings.canvas.height - 2*M - 2 * innerOffset) / (N - 1))
        const attempts = []
        for(let i = 0; i < N; i++) {
            // Clear
            canvas.clear()
            bindings.messages.innerHTML = ''

            // Draw margins
            canvas.line({ x: M, y: M }, { x: bindings.canvas.width - M, y: M }, { ...opts, lineColor: 'rgba(0,0,0,0.3)' })
            canvas.line({ x: M, y: M }, { x: M, y: bindings.canvas.height - M }, { ...opts, lineColor: 'rgba(0,0,0,0.3)' })
            canvas.line({ x: bindings.canvas.width/2, y: M }, { x: bindings.canvas.width/2, y: bindings.canvas.height - M }, { ...opts, lineColor: 'rgba(0,0,0,0.3)' })
            canvas.line({ x: bindings.canvas.width - M, y: M }, { x: bindings.canvas.width - M, y: bindings.canvas.height - M }, { ...opts, lineColor: 'rgba(0,0,0,0.3)' })
            canvas.line({ x: M, y: bindings.canvas.height - M }, { x: bindings.canvas.width - M, y: bindings.canvas.height - M }, { ...opts, lineColor: 'rgba(0,0,0,0.3)' })

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

        // Retry button
        drawRetryButton(drawingLoop, bindings, observables, opts, onCancel)

        return attempts
    }

    return {
        start
    }
})()

window.addEventListener('load', Main.start)