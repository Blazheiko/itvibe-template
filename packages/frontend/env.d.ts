/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_BASE_URL?: string
    readonly VITE_SENTRY_DSN?: string
    readonly VITE_SENTRY_ENABLED?: string
    readonly VITE_SENTRY_ENVIRONMENT?: string
    readonly VITE_SENTRY_RELEASE?: string
    readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string
    readonly VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE?: string
    readonly VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE?: string
  }
}
