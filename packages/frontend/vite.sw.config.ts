import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// Конфигурация для сборки Service Worker
export default defineConfig({
    build: {
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
