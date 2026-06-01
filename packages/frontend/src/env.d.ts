/// <reference types="vite/client" />
import 'vue-router'

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<object, object, unknown>
    export default component
}

declare module 'vue-router' {
    interface RouteMeta {
        requiresAuth?: boolean
        title?: string
        hideHeader?: boolean
        authModal?: 'login' | 'register'
        requiresAdmin?: boolean
        showBack?: boolean
    }
}

declare global {
    interface ImportMetaEnv {
        readonly VITE_BASE_URL?: string
    }

    interface ImportMeta {
        readonly env: ImportMetaEnv
    }

    const BUILD_TIMESTAMP: string

    // Speech Recognition API types
    interface SpeechRecognition extends EventTarget {
        continuous: boolean
        interimResults: boolean
        lang: string
        maxAlternatives: number
        start(): void
        stop(): void
        abort(): void
        onstart: ((this: SpeechRecognition, ev: Event) => void) | null
        onend: ((this: SpeechRecognition, ev: Event) => void) | null
        onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
        onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
    }

    interface SpeechRecognitionErrorEvent extends Event {
        error: string
        message: string
    }

    interface SpeechRecognitionEvent extends Event {
        resultIndex: number
        results: SpeechRecognitionResultList
    }

    interface SpeechRecognitionResultList {
        length: number
        item(index: number): SpeechRecognitionResult
        [index: number]: SpeechRecognitionResult
    }

    interface SpeechRecognitionResult {
        length: number
        item(index: number): SpeechRecognitionAlternative
        [index: number]: SpeechRecognitionAlternative
        isFinal: boolean
    }

    interface SpeechRecognitionAlternative {
        transcript: string
        confidence: number
    }

    const SpeechRecognition: {
        prototype: SpeechRecognition
        new (): SpeechRecognition
    }

    const webkitSpeechRecognition: {
        prototype: SpeechRecognition
        new (): SpeechRecognition
    }

    interface Window {
        SpeechRecognition: typeof SpeechRecognition
        webkitSpeechRecognition: typeof webkitSpeechRecognition
    }
}

export {}
