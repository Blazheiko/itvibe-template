/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Backend origin; empty — same origin through the dev proxy. */
    readonly VITE_API_BASE_URL?: string
    /** Backend API_PATH_PREFIX (default `api`). */
    readonly VITE_API_PATH_PREFIX?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
