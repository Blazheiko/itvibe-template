import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    // Proxy the backend's API_PATH_PREFIX, not a hard-coded /api (code-issues item 62).
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    const prefix = (env['VITE_API_PATH_PREFIX'] ?? '').trim().replace(/^\/+|\/+$/g, '') || 'api'
    return {
        plugins: [vue(), vueDevTools()],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
        server: {
            port: 5174,
            proxy: {
                [`/${prefix}`]: {
                    target: 'http://127.0.0.1:3000',
                    changeOrigin: true,
                },
                '/ws': {
                    target: 'ws://127.0.0.1:3000',
                    ws: true,
                },
            },
        },
    }
})
