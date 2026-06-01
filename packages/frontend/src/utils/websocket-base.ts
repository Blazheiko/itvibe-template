import {
    getResponseMessage,
    getTransportCode,
    hasResponseError,
    normalizeResponseError,
} from './response-normalizer'
import type { ErrorCode } from 'shared/errors'

interface WebsocketConnection {
    ws: WebSocket | null
    closeInitiated?: boolean
    timerPing?: number
    timerPongTimeout?: number
}

interface ApiResolveItem {
    resolve: (data: WebsocketMessage) => void
    reject: (error?: ApiError) => void
    timeout: number
}

export type WebsocketPayload = Record<string, unknown>;
export type WebsocketErrorMessages = Record<string, unknown> | string[] | string

interface WebsocketErrorPayload {
    code?: number | ErrorCode
    message?: string
    messages?: WebsocketErrorMessages
}

export interface WebsocketMessage {
    event: string
    status: number | string
    timestamp: number
    payload: WebsocketPayload
    code?: number | string | ErrorCode
    error?: WebsocketErrorPayload | null
}

export interface ApiError {
    code?: ErrorCode
    transportCode?: number
    status?: number | string
    message?: string
    messages?: WebsocketErrorMessages
}

interface SendPayload {
    event: string
    timestamp: number
    payload: Record<string, unknown>
}

export const buildApiError = (data: WebsocketMessage): ApiError => {
    const normalizedError = normalizeResponseError(data, 'WebSocket request failed')
    return {
        code: normalizedError.code,
        transportCode: normalizedError.transportCode,
        status: normalizedError.status,
        message: normalizedError.message,
        messages: normalizedError.messages,
    }
}

enum ConnectionStatus {
    CONNECTING = 0,
    OPEN = 1,
    CLOSING = 2,
    CLOSED = 3,
}

interface WebsocketCallbacks {
    onReauthorize?: () => Promise<void>
    onBroadcast?: (message: WebsocketMessage) => void
    onConnectionClosed?: () => void
}

// interface ServiceError {
//     code: number
//     message: string
// }

interface WebsocketConfig {
    reconnectDelay?: number
    maxReconnectAttempts?: number
    pingInterval?: number
    timeout?: number
    authToken?: string
    callbacks?: WebsocketCallbacks
    timeoutApi?: number
    pongTimeout?: number
}

class WebsocketBase {
    private reconnectDelay: number
    private maxReconnectAttempts: number
    private reconnectAttempts: number
    private pingInterval: number
    private timeout: number
    private authToken?: string
    private callbacks?: WebsocketCallbacks
    private wsConnection: WebsocketConnection
    private apiResolve: Record<string, ApiResolveItem>
    private connectionEstablished: boolean
    private timerClose?: number
    private messageQueue: SendPayload[] = []
    private isDestroyed = false
    private timerReconnect?: number
    private timeoutApi: number
    private pongTimeout: number
    private url: string

    constructor(url: string, options: WebsocketConfig = {}) {
        this.url = url
        this.reconnectDelay = options.reconnectDelay || 5000
        this.maxReconnectAttempts = options.maxReconnectAttempts || 500
        this.reconnectAttempts = 0
        this.pingInterval = options.pingInterval || 10000
        this.timeout = options.timeout || 20000
        this.pongTimeout = options.pongTimeout || 5000
        this.authToken = options.authToken
        this.callbacks = options.callbacks
        this.wsConnection = {
            ws: null,
            closeInitiated: false,
            timerPing: undefined,
            timerPongTimeout: undefined,
        }
        this.apiResolve = {}
        this.connectionEstablished = false
        this.timeoutApi = options.timeoutApi || 10000
        this.initConnect(url)
    }

    isConnected(): boolean {
        return (
            Boolean(this.wsConnection.ws) &&
            this.wsConnection.ws?.readyState === ConnectionStatus.OPEN
        )
    }

    private initConnect(url: string): void {
        if (this.isDestroyed) {
            console.warn('WebSocket instance has been destroyed, cannot reconnect')
            return
        }

        console.log(`Connecting to WebSocket server: ${url}`)
        this.wsConnection.ws = new WebSocket(url)
        // this.wsConnection.ws = ws
        this.wsConnection.closeInitiated = false

        this.wsConnection.ws.onopen = (): void => {
            console.log(`Open to WebSocket server: ${url}`)
            this.reconnectAttempts = 0

            // if (this.authToken) {
            //     this.send({ event: 'auth', payload: { token: this.authToken } })
            // }

            this.wsConnection.timerPing = window.setTimeout(() => {
                this.pingServer()
            }, this.pingInterval)

            this.processMessageQueue()
        }

        this.wsConnection.ws.onmessage = (message: MessageEvent): void => {
            try {
                console.log('onmessage: ', message.data)
                const data: WebsocketMessage = JSON.parse(message.data as string)
                if (!this.validateMessage(data)) {
                    console.error('Invalid message format:', data)
                    return
                }

                if (data.event === 'service:error') {
                    this.handleServiceError(data)
                } else if (data.event.startsWith('broadcast:')) {
                    this.handleBroadcast(data)
                } else if (data.event.startsWith('service:')) {
                    this.service(data)
                } else if (data.event.startsWith('api')) {
                    this.messageHandler(data)
                }
            } catch (error) {
                console.error('Error parsing message:', error)
            }
        }

        this.wsConnection.ws.onerror = (err: Event): void => {
            console.error('WebSocket error:', err)
            // Не переподключаемся сразу - ждем события onclose с кодом закрытия
        }

        this.wsConnection.ws.onclose = (event: CloseEvent): void => {
            if (!this.wsConnection.closeInitiated) {
                console.warn(`Connection closed: ${event.code} - ${event.reason}`)
                this.handleConnectionClose(event.code, event.reason)
            } else {
                this.wsConnection.closeInitiated = false
            }
        }
    }

    private validateMessage(message: WebsocketMessage): boolean {
        return Boolean(
            message &&
                typeof message.event === 'string' &&
                (!message.payload || typeof message.payload === 'object'),
        )
    }

    /**
     * Обработка закрытия соединения с учетом кода закрытия
     */
    private handleConnectionClose(code: number, reason: string): void {
        console.log(`Handling connection close with code: ${code}, reason: ${reason}`)

        if (code === 1000 || code === 1006) {
            console.log('Connection closed normally')
            this.handleReconnect()
            return
        }

        // Код < 4100: нельзя переподключаться
        if (code >= 4000 && code < 4100) {
            console.error(`Connection closed with code ${code}. Reconnection is not allowed.`)
            // Помечаем как уничтоженный, чтобы предотвратить дальнейшие попытки
            this.isDestroyed = true
            this.callbacks?.onConnectionClosed?.()
            return
        }

        // Код 4100-4199: переподключаться с задержкой 1-30 сек
        if (code >= 4100 && code < 4200) {
            const delay = Math.floor(Math.random() * 29000) + 1000 // случайная задержка от 1 до 30 сек
            console.warn(`Connection closed with code ${code}. Reconnecting in ${delay}ms`)
            this.reconnectWithDelay(delay)
            return
        }

        // Код >= 4200: переподключаться сразу
        if (code >= 4200) {
            console.warn(`Connection closed with code ${code}. Reconnecting immediately`)
            this.handleReconnect()
            return
        }
    }

    /**
     * Переподключение с заданной задержкой
     */
    private reconnectWithDelay(delay: number): void {
        if (this.isDestroyed) {
            return
        }

        if (this.timerReconnect) {
            window.clearTimeout(this.timerReconnect)
        }

        this.timerReconnect = window.setTimeout(() => {
            if (!this.isDestroyed) {
                this.cleanupConnection()
                this.initConnect(this.url)
            }
        }, delay)
    }

    /**
     * Очистка соединения перед переподключением
     */
    private cleanupConnection(): void {
        console.log('Cleaning up connection before reconnect')
        this.wsConnection.closeInitiated = true

        // Очищаем все таймеры
        if (this.wsConnection.timerPing) {
            window.clearTimeout(this.wsConnection.timerPing)
            this.wsConnection.timerPing = undefined
        }

        if (this.wsConnection.timerPongTimeout) {
            window.clearTimeout(this.wsConnection.timerPongTimeout)
            this.wsConnection.timerPongTimeout = undefined
        }

        // Закрываем WebSocket если он существует
        if (this.wsConnection.ws) {
            const ws = this.wsConnection.ws

            // Удаляем обработчики
            ws.onclose = null
            ws.onerror = null
            ws.onmessage = null
            ws.onopen = null

            // Закрываем соединение если оно открыто
            if (
                ws.readyState === ConnectionStatus.OPEN ||
                ws.readyState === ConnectionStatus.CONNECTING
            ) {
                try {
                    ws.close(1000, 'Reconnecting')
                } catch (error) {
                    console.error('Error closing WebSocket during cleanup:', error)
                }
            }

            // Обнуляем ссылку
            this.wsConnection.ws = null
        }
    }

    private handleReconnect(): void {
        if (this.isDestroyed) {
            return
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            const delay = Math.min(
                this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
                15000,
            )
            console.warn(
                `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
            )

            this.timerReconnect = window.setTimeout(() => {
                if (!this.isDestroyed) {
                    this.cleanupConnection()
                    this.initConnect(this.url)
                }
            }, delay)
        } else {
            console.error('Max reconnection attempts reached')
            this.callbacks?.onConnectionClosed?.()
        }
    }

    private processMessageQueue(): void {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift()
            if (message) {
                this.send(message)
            }
        }
    }

    /**
     * Gracefully disconnect the WebSocket connection
     * Unlike destroy(), this allows reconnection attempts
     */
    disconnect(): void {
        if (!this.isConnected()) {
            console.warn('No connection to close.')
            return
        }

        console.log('Disconnecting WebSocket')
        this.wsConnection.closeInitiated = true

        // Очищаем таймеры пинга и понга
        if (this.wsConnection.timerPing) {
            window.clearTimeout(this.wsConnection.timerPing)
            this.wsConnection.timerPing = undefined
        }

        if (this.wsConnection.timerPongTimeout) {
            window.clearTimeout(this.wsConnection.timerPongTimeout)
            this.wsConnection.timerPongTimeout = undefined
        }

        // Закрываем соединение с нормальным кодом
        if (this.wsConnection.ws) {
            try {
                this.wsConnection.ws.close(1000, 'Client disconnecting')
            } catch (error) {
                console.error('Error during disconnect:', error)
            }
        }

        console.log('WebSocket disconnected')
    }

    /**
     * Send Ping message to the Websocket Server
     */
    pingServer(): void {
        if (this.isDestroyed) {
            return
        }

        if (!this.isConnected()) {
            console.warn('Ping only can be sent when connection is ready.')
            return
        }
        console.log('Ping server')
        this.send({ event: 'service:ping', payload: {}, timestamp: Date.now() })

        // Устанавливаем таймаут для ожидания понга
        if (this.wsConnection.timerPongTimeout) {
            window.clearTimeout(this.wsConnection.timerPongTimeout)
        }

        this.wsConnection.timerPongTimeout = window.setTimeout(() => {
            console.warn('Pong timeout - no response from server')
            // Закрываем соединение с кодом 4200 для немедленного переподключения
            if (this.wsConnection.ws) {
                this.wsConnection.ws.close(4200, 'Pong timeout')
            }
        }, this.pongTimeout)
    }

    send(payload: SendPayload): void {
        if (this.isDestroyed) {
            return
        }

        if (!this.isConnected()) {
            console.warn('Connection not ready, adding to queue')
            this.messageQueue.push(payload)
            return
        }

        if (this.timerClose) {
            window.clearTimeout(this.timerClose)
        }

        this.timerClose = window.setTimeout(() => {
            this.disconnect()
        }, this.timeout)

        if (this.wsConnection.ws) {
            try {
                if (this.wsConnection.timerPing) window.clearTimeout(this.wsConnection.timerPing)
                this.wsConnection.ws.send(JSON.stringify(payload))
                clearTimeout(this.wsConnection.timerPing)
                this.wsConnection.timerPing = window.setTimeout(() => {
                    this.pingServer()
                }, this.pingInterval)
            } catch (error) {
                console.error('Error sending message:', error)
                this.messageQueue.push(payload)
            }
        }
    }

    async api(route: string, payload: Record<string, unknown> = {}): Promise<WebsocketMessage> {
        return new Promise((resolve, reject) => {
            const event = `api/${route}:${Date.now()}`
            if (this.apiResolve[event]) reject()

            this.send({ event, payload, timestamp: Date.now() })
            this.apiResolve[event] = {
                resolve,
                reject,
                timeout: window.setTimeout(() => {
                    reject()
                }, this.timeoutApi),
            }
        })
    }

    private service(data: WebsocketMessage): void {
        const serviceHandlers: Record<string, (payload: WebsocketPayload) => void | boolean> = {
            pong: () => {
                console.log('Pong received')
                if (this.timerClose) window.clearTimeout(this.timerClose)
                // Очищаем таймаут ожидания понга
                if (this.wsConnection.timerPongTimeout) {
                    window.clearTimeout(this.wsConnection.timerPongTimeout)
                    this.wsConnection.timerPongTimeout = undefined
                }
            },
            connection_established: (payload: WebsocketPayload) => {
                this.connectionEstablished = true
                console.log('connection_established', payload)
                // return this.connectionEstablished
            },
            connection_closed: () => {
                console.log('connection_closed')
                this.callbacks?.onConnectionClosed?.()
            },
        }

        if (data && data.event) {
            const arr = data.event.split(':')
            if (arr.length < 2) return
            const handlerName = arr[1]
            const handler = serviceHandlers[handlerName]
            if (handler) handler(data.payload)
        }
    }

    private messageHandler(data: WebsocketMessage): void {
        console.log('message handler')
        // const arr = data.event.split(':')
        // if (arr.length < 2) return
        // const route = arr[1]
        const cb = this.apiResolve[data.event]
        if (!cb) return
        window.clearTimeout(cb.timeout)
        delete this.apiResolve[data.event]
        if (!hasResponseError(data) && cb.resolve) cb.resolve(data)
        else if (cb.reject) cb.reject(buildApiError(data))
    }

    private handleConnectionClosed(): void {
        console.log('handleConnectionClosed')
        this.destroy()
        if (this.callbacks?.onConnectionClosed) {
            this.callbacks.onConnectionClosed()
        }
    }

    private async handleReauthorize(): Promise<void> {
        try {
            this.destroy()
            if (this.callbacks?.onReauthorize) {
                console.error('handleReauthorize callback')
                await this.callbacks.onReauthorize()
            }
        } catch (error) {
            console.error('Reauthorization failed:', error)
        }
    }

    private handleServiceError(data: WebsocketMessage): void {
        if (getTransportCode(data) === 4001) {
            console.warn('Token expired or invalid:', getResponseMessage(data, 'Token expired or invalid'))
            this.handleConnectionClosed()
        }
    }

    private handleBroadcast(message: WebsocketMessage): void {
        console.log('handleBroadcast', message)
        if (this.callbacks?.onBroadcast) {
            this.callbacks.onBroadcast(message)
        }
    }

    /**
     * Полностью уничтожает экземпляр WebSocket соединения
     * Закрывает соединение, очищает таймеры и освобождает ресурсы
     */
    destroy(): void {
        console.log('destroy WebsocketBase')
        if (this.isDestroyed) {
            return
        }

        // Помечаем как уничтоженный в самом начале, чтобы предотвратить любые операции
        this.isDestroyed = true

        // 1. Сначала очищаем ВСЕ таймеры, чтобы предотвратить переподключения и пинги
        if (this.timerReconnect) {
            window.clearTimeout(this.timerReconnect)
            this.timerReconnect = undefined
        }

        if (this.wsConnection?.timerPing) {
            window.clearTimeout(this.wsConnection.timerPing)
            this.wsConnection.timerPing = undefined
        }

        if (this.wsConnection?.timerPongTimeout) {
            window.clearTimeout(this.wsConnection.timerPongTimeout)
            this.wsConnection.timerPongTimeout = undefined
        }

        if (this.timerClose) {
            window.clearTimeout(this.timerClose)
            this.timerClose = undefined
        }

        // 2. Закрываем WebSocket соединение
        if (this.wsConnection.ws) {
            const ws = this.wsConnection.ws

            // Устанавливаем флаг, чтобы onclose не вызвал переподключение
            this.wsConnection.closeInitiated = true

            // Сначала удаляем все обработчики событий
            ws.onclose = null
            ws.onerror = null
            ws.onmessage = null
            ws.onopen = null

            // Закрываем соединение с кодом нормального закрытия
            // Проверяем состояние перед закрытием
            if (
                ws.readyState === ConnectionStatus.OPEN ||
                ws.readyState === ConnectionStatus.CONNECTING
            ) {
                try {
                    ws.close(1000, 'Client destroying connection')
                } catch (error) {
                    console.error('Error closing WebSocket:', error)
                }
            }

            // Явно обнуляем ссылку
            this.wsConnection.ws = null
        }

        // 3. Очищаем очередь сообщений
        this.messageQueue = []

        // 4. Очищаем обработчики API с отклонением всех промисов
        Object.values(this.apiResolve).forEach((item) => {
            if (item.timeout) {
                window.clearTimeout(item.timeout)
            }
            item.reject({ message: 'WebSocket connection destroyed' })
        })
        this.apiResolve = {}

        // 5. Сбрасываем состояние
        this.connectionEstablished = false
        this.wsConnection = {
            ws: null,
            closeInitiated: false,
            timerPing: undefined,
            timerPongTimeout: undefined,
        }

        console.log('WebsocketBase destroyed successfully')
    }
}

export default WebsocketBase
