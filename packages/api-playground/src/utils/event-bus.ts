export interface Events {
  broadcast: unknown
  unauthorized: void
}

type EventKey = keyof Events
type EventHandler<T> = (payload: T) => void

interface EventBus {
  on<K extends EventKey>(event: K, handler: EventHandler<Events[K]>): void
  off<K extends EventKey>(event: K, handler: EventHandler<Events[K]>): void
  emit<K extends EventKey>(
    event: K,
    ...args: Events[K] extends void ? [] : [payload: Events[K]]
  ): void
}

const listeners = new Map<EventKey, Set<EventHandler<never>>>()

const getListeners = <K extends EventKey>(event: K): Set<EventHandler<Events[K]>> => {
  const current = listeners.get(event)
  if (current !== undefined) {
    return current as Set<EventHandler<Events[K]>>
  }

  const next = new Set<EventHandler<never>>()
  listeners.set(event, next)
  return next as Set<EventHandler<Events[K]>>
}

const emitter: EventBus = {
  on(event, handler) {
    getListeners(event).add(handler)
  },
  off(event, handler) {
    getListeners(event).delete(handler)
  },
  emit(event, ...args) {
    const payload = args[0]!
    for (const handler of getListeners(event)) {
      handler(payload)
    }
  },
}

export const useEventBus = (): EventBus => emitter
