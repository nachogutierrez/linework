const Calculate = (function() {

    /**
     * Calculates the end-point of the accuracy error line for a given point in the reference line.
     * @param {*} points represents the line drawn. Needs to be sorted by x-position.
     * @param {*} target is a point on the reference line.
     */
    function calculateErrorPoint(points, target) {
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

    /**
     * Given an array of datapoints, calculates min, avg and max.
     */
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
    
    /**
     * Control error lines representation:
     *      {
     *          left: [x1, x2, y]
     *          right: [x1, x2, y]
     *      }
     *      x1: x-position of the left-end of the line
     *      x2: x-position of the right-end of the line
     *      y: y-position of the line
     * Accuracy error lines representation:
     *      [
     *          [x, y, y2]
     *      ]
     *      x: x-position of the accuracy error line
     *      y: y-position of the intersection between the reference line and the accuracy error line
     *      y2: y-position of the other end of the error line
     */
    function calculateErrorLines(referenceLine, lineDrawn, opts = {}) {
        const { accuracyErrorJump = 5 } = opts
        const { lineY, lineWidth, lineOffsetX } = referenceLine

        // Control
        const leftMost = lineDrawn.reduce((({ x:x1, y:y1 }, { x:x2, y:y2 }) => x1 <= x2 ? ({ x: x1, y: y1 }) : ({ x: x2, y: y2 })), { x: Infinity, y:0 })
        const rightMost = lineDrawn.reduce((({ x:x1, y:y1 }, { x:x2, y:y2 }) => x1 >= x2 ? ({ x: x1, y: y1 }) : ({ x: x2, y: y2 })), { x: -Infinity, y:0 })
        const control = {
            left: [lineOffsetX, leftMost.x, lineY],
            right: [lineOffsetX + lineWidth, rightMost.x, lineY]
        }

        // Accuracy
        const sortedLineDrawn = [...lineDrawn]
        sortedLineDrawn.sort((a, b) => a.x - b.x)
        const accuracy = []
        for (let i = 0; lineOffsetX + i*accuracyErrorJump <= lineOffsetX + lineWidth; i++) {
            const x = lineOffsetX + i*accuracyErrorJump
            const y = lineY
            const errorPoint = calculateErrorPoint(sortedLineDrawn, { x, y })
            if (errorPoint) {
                accuracy.push([x, y, errorPoint.y - y])
            }
        }

        return {
            control,
            accuracy
        }
    }

    /**
     * Calculates all the error values for a given set of error lines.
     */
    function calculateErrorValues(errorLines) {
        const { control:controlLines, accuracy:accuracyLines } = errorLines

        // Control
        const { left, right } = controlLines
        const control = Math.abs(left[0] - left[1]) + Math.abs(right[0] - right[1])

        // Accuracy
        const accuracy = accuracyLines
        .map(aLine => Math.abs(aLine[2]))
        .filter(x => !isNaN(x))
        .reduce((a, b) => a + b, 0)/accuracyLines.length

        return {
            control,
            accuracy
        }
    }

    return {
        calculateErrorPoint,
        calculateStats,
        calculateErrorLines,
        calculateErrorValues
    }
})()