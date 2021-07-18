const Settings = (function(modalEl) {

    const { STORAGE } = Constants

    function open(settingsData, cb) {
        modalEl.innerHTML = render(settingsData)
        modalEl.querySelector('.modal-background').addEventListener('click', () => close())
        modalEl.querySelector('.cancel-btn').addEventListener('click', () => close())
        modalEl.querySelector('.apply-btn').addEventListener('click', () => {
            cb(readSettingsFromModal())
            close()
        })
        modalEl.querySelector('.set-defaults-btn').addEventListener('click', () => {
            cb(Constants.DEFAULT_SETTINGS)
            close()
        })
        const resetPbButton = modalEl.querySelector('.reset-pb-btn')
        if (resetPbButton) {
            resetPbButton.addEventListener('click', () => {
                localStorage.removeItem(STORAGE.BEST_CONTROL_AVG)
                localStorage.removeItem(STORAGE.BEST_ACCURACY_AVG)
                close()
            })
        }
        
    }

    function readSettingsFromModal() {
        const N = parseInt(modalEl.querySelector('.amount-lines').value, 10)
        const selectedLineSize = modalEl.querySelector('.line-size:checked').value
        const shortLines = selectedLineSize === 'short_lines'
        const selectedMode = modalEl.querySelector('.draw-mode:checked').value
        const landscapeMode = selectedMode === 'landscape_mode'
        
        return {
            N,
            shortLines,
            landscapeMode
        }
    }

    function close() {
        modalEl.innerHTML = ''
    }

    function render(props) {
        const { N, shortLines, landscapeMode } = props
        const bestControlAvg = localStorage.getItem(STORAGE.BEST_CONTROL_AVG)
        const bestAccuracyAvg = localStorage.getItem(STORAGE.BEST_ACCURACY_AVG)
        return (`
            <div class='modal-background'></div>
            <div class='modal-content'>
                <h3>Settings</h3>
                <div>
                    <label>Amount of lines (between 20 and 40):</label>
                    <input class='amount-lines' type='number' min="20" max="40" value="${N}"></input>
                    <br>
                    <label>Line size:</label>
                    <label>short</label>
                    <input class='line-size' type='radio' name='type_of_lines' value='short_lines' ${shortLines ? 'checked' : ''}>
                    <label>long</label>
                    <input class='line-size' type='radio' name='type_of_lines' value='long_lines' ${!shortLines ? 'checked' : ''}>
                    <br>
                    <label>Paper orientation:</label>
                    <label>vertical</label>
                    <input class='draw-mode' type='radio' name='draw_mode' value='normal_mode' ${!landscapeMode ? 'checked' : ''}>
                    <label>horizontal</label>
                    <input class='draw-mode' type='radio' name='draw_mode' value='landscape_mode' ${landscapeMode ? 'checked' : ''}>
                </div>

                <div style='display: flex; justify-content: flex-end; margin-top: 16px;'>
                    <div style='width: 100%;'>
                        <div class='set-defaults-btn unselectable button clickable' style='margin: 2px;'>set defaults</div>
                    </div>
                    <div class='cancel-btn unselectable button clickable' style='margin: 2px;'>cancel</div>
                    <div class='apply-btn unselectable button clickable' style='margin: 2px;'>apply</div>
                </div>
                ${!bestControlAvg || !bestAccuracyAvg ? '' : `
                <h3>Personal best</h3>
                <div>
                    <p>Best control avg: <b>${parseFloat(bestControlAvg).toFixed(2)}</b></p>
                    <p>Best accuracy avg: <b>${parseFloat(bestAccuracyAvg).toFixed(2)}</b></p>
                </div>
                <div style='display: flex; justify-content: flex-start; margin-top: 4px;'>
                    <div class='reset-pb-btn unselectable button clickable warning' style='margin: 2px;'>reset pb</div>
                </div>
                `}
            </div>
        `)
    }

    return {
        open
    }
})