import aiConfig from '#config/ai.js'

// Every provider call is bounded by AI_REQUEST_TIMEOUT_MS and also stops when the
// caller's signal aborts — the HTTP client went away or the WS connection closed
// (code-issues item 51).
export function aiRequestSignal(
    signal?: AbortSignal,
    timeoutMs: number = aiConfig.requestTimeoutMs,
): AbortSignal {
    const timeout = AbortSignal.timeout(timeoutMs)
    return signal === undefined ? timeout : AbortSignal.any([signal, timeout])
}

export type AiAbortKind = 'timeout' | 'aborted'

// Which abort ended a failed call, if any. SDKs wrap the DOMException differently,
// so the cause chain is walked too.
export function aiAbortKind(error: unknown): AiAbortKind | null {
    let current: unknown = error
    for (let depth = 0; depth < 5 && current !== null && typeof current === 'object'; depth++) {
        const name = (current as { name?: unknown }).name
        if (name === 'TimeoutError') return 'timeout'
        if (name === 'AbortError') return 'aborted'
        current = (current as { cause?: unknown }).cause
    }
    return null
}
