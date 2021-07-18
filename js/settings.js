const Settings = (function(modalEl) {

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
        return (`
            <div class='modal-background'></div>
            <div class='modal-content'>
                <div>
                    <label>Amount of lines (between 20 and 40):</label>
                    <input class='amount-lines' type='number' min="20" max="40" value="${N}"></input>
                    <br>
                    <label>Short lines</label>
                    <input class='line-size' type='radio' name='type_of_lines' value='short_lines' ${shortLines ? 'checked' : ''}>
                    <label>Long lines</label>
                    <input class='line-size' type='radio' name='type_of_lines' value='long_lines' ${!shortLines ? 'checked' : ''}>
                    <br>
                    <label>Normal mode</label>
                    <input class='draw-mode' type='radio' name='draw_mode' value='normal_mode' ${!landscapeMode ? 'checked' : ''}>
                    <label>Landscape mode</label>
                    <input class='draw-mode' type='radio' name='draw_mode' value='landscape_mode' ${landscapeMode ? 'checked' : ''}>
                </div>

                <div>
                    <button class='set-defaults-btn unselectable'>set defaults</button>
                    <button class='cancel-btn unselectable'>cancel</button>
                    <button class='apply-btn unselectable'>apply</button>
                </div>
            </div>
        `)
    }

    return {
        open
    }
})