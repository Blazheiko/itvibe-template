import { reactive } from 'vue'

export interface ResourceState<T = void> {
    isLoaded: boolean
    isLoading: boolean
    loadedAt: number | null
    error: string | null
    pendingPromise: Promise<T> | null
    abortController: AbortController | null
    ttlMs: number
    isStale: boolean
}

interface EnsureLoadedOptions<T> {
    force?: boolean
    getCachedValue?: () => T
}

interface LoadContext {
    signal: AbortSignal
    isAborted: () => boolean
}

const createAbortError = (): DOMException => new DOMException('The operation was aborted.', 'AbortError')

export const isAbortError = (error: unknown): boolean =>
    error instanceof DOMException
        ? error.name === 'AbortError'
        : error instanceof Error && error.name === 'AbortError'

export const getErrorMessage = (error: unknown, fallbackMessage = 'Failed to load resource'): string => {
    if (typeof error === 'string' && error.trim().length > 0) {
        return error
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message
    }

    return fallbackMessage
}

export function createResource<T = void>(ttlMs = 30_000) {
    const getInitialState = (): ResourceState<T> => ({
        isLoaded: false,
        isLoading: false,
        loadedAt: null,
        error: null,
        pendingPromise: null,
        abortController: null,
        ttlMs,
        isStale: false,
    })

    const state = reactive<ResourceState<T>>(getInitialState())

    const shouldUseCache = (force = false): boolean => {
        if (force) return false
        if (!state.isLoaded || state.isStale || state.loadedAt === null) return false
        return Date.now() - state.loadedAt < state.ttlMs
    }

    const markStale = () => {
        state.isStale = true
    }

    const reset = () => {
        state.abortController?.abort()
        Object.assign(state, getInitialState())
    }

    const ensureLoaded = async (
        loader: (context: LoadContext) => Promise<T>,
        options: EnsureLoadedOptions<T> = {},
    ): Promise<T> => {
        const force = options.force === true

        if (shouldUseCache(force)) {
            return options.getCachedValue ? options.getCachedValue() : (undefined as T)
        }

        if (state.pendingPromise !== null && !force) {
            return await state.pendingPromise
        }

        if (force && state.pendingPromise !== null) {
            state.abortController?.abort()
        }

        const abortController = new AbortController()
        state.abortController = abortController
        state.isLoading = true
        state.error = null

        let request: Promise<T> | null = null
        request = (async () => {
            try {
                const result = await loader({
                    signal: abortController.signal,
                    isAborted: () => abortController.signal.aborted,
                })

                if (abortController.signal.aborted) {
                    throw createAbortError()
                }

                state.isLoaded = true
                state.isStale = false
                state.loadedAt = Date.now()
                return result
            } catch (error) {
                if (!isAbortError(error)) {
                    state.error = getErrorMessage(error)
                }
                throw error
            } finally {
                if (request !== null && state.pendingPromise === request) {
                    state.pendingPromise = null
                }
                if (state.abortController === abortController) {
                    state.abortController = null
                    state.isLoading = false
                }
            }
        })()

        state.pendingPromise = request

        return await request
    }

    const load = async (loader: (context: LoadContext) => Promise<T>): Promise<T> => {
        return await ensureLoaded(loader, { force: true })
    }

    return {
        state,
        shouldUseCache,
        ensureLoaded,
        load,
        markStale,
        reset,
    }
}
