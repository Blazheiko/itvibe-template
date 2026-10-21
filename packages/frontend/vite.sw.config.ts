import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

import { stripConsoleLogs } from './vite.console'

// Конфигурация для сборки Service Worker
export default defineConfig({
    esbuild: stripConsoleLogs,
    build: {
        // Same browser floor as the app bundle (see vite.config.ts).
        target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
        lib: {
            entry: fileURLToPath(new URL('./src/service-worker.ts', import.meta.url)),
            name: 'ServiceWorker',
            fileName: () => 'service-worker.js',
            formats: ['iife'],
        },
        outDir: 'dist',
        emptyOutDir: false, // Не очищаем папку dist
        rollupOptions: {
            output: {
                entryFileNames: 'service-worker.js',
                format: 'iife',
            },
        },
    },
    define: {
        BUILD_TIMESTAMP: JSON.stringify(Date.now()),
    },
})
