const Canvas = (function(canvasEl) {

    const ctx = canvasEl.getContext('2d')

    function clear() {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
    }

    function point(x, y) {
        ctx.fillRect(x,y,1,1)
    }

    function line({ x:x1, y:y1 }, { x:x2, y:y2 }, opts = {}) {
        withOpts(opts, () => {
            ctx.beginPath()
            ctx.lineCap = 'round'
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
        })
    }

    function withOpts(opts = {}, f) {
        const { lineColor } = opts
        const backupLineColor = ctx.strokeStyle
        if (lineColor) ctx.strokeStyle = lineColor
        
        f()

        ctx.strokeStyle = backupLineColor
    }

    function getMousePosition(e) {
        const rect = canvasEl.getBoundingClientRect();
        const scaleX = canvasEl.width / rect.width
        const scaleY = canvasEl.height / rect.height

        return {
          x: Math.min(Math.max((e.clientX - rect.left)*scaleX, 0), rect.width),
          y: Math.min(Math.max((e.clientY - rect.top)*scaleY, 0), rect.height)
        };
    }

    return {
        clear,
        point,
        line,
        getMousePosition
    }
})