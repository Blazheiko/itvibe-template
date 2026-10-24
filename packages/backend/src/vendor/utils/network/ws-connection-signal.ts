// One AbortSignal per WebSocket connection, aborted when it closes. Work started
// for a connection (Support AI streaming) passes it on, so a closed connection
// stops the provider call instead of streaming into the void (code-issues item 51).
const controllers = new WeakMap<object, AbortController>()

export function connectionSignal(ws: object): AbortSignal {
    let controller = controllers.get(ws)
    if (controller === undefined) {
        controller = new AbortController()
        controllers.set(ws, controller)
    }
    return controller.signal
}

export function abortConnection(ws: object): void {
    controllers.get(ws)?.abort()
    controllers.delete(ws)
}
