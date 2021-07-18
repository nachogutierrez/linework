/**
 * Works as a one-time callback caller.
 */
const Notifier = (function() {

    let listeners = {}

    /**
     * Subscribe to a specific label. Next time the label is notified,
     * the callback will be called and the removed.
     */
    const subscribe = label => f => {
        if (!listeners[label]) {
            listeners[label] = []
        }
        listeners[label].push(f)
    }

    /**
     * Iterate and call the callbacks in the specified label.
     */
    function notify(label) {
        if (!listeners[label]) return
        listeners[label].forEach(f => f())
        delete listeners[label]
    }

    return {
        subscribe,
        notify
    }
})()