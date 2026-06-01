import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue({
            template: {
                compilerOptions: {
                    isCustomElement: (tag) => tag === 'pwa-install',
                },
            },
        }),
        vueDevTools(),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
        conditions: ['import', 'module', 'browser', 'default'],
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true,
            },
            '/ws': {
                target: 'ws://127.0.0.1:3000',
                ws: true,
            },
        },
    },
    define: {
        BUILD_TIMESTAMP: JSON.stringify(Date.now()),
        __INTLIFY_JIT_COMPILATION__: true,
        __INTLIFY_DROP_MESSAGE_COMPILER__: false,
    },
})
