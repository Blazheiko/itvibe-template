import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

// A package-local module cache: the workspace-root one races with the other packages under `pnpm test`.
export default defineConfig((env) =>
    mergeConfig(
        viteConfig(env),
        defineConfig({
            test: {
                fsModuleCachePath: fileURLToPath(
                    new URL('./node_modules/.vitest-cache', import.meta.url),
                ),
                environment: 'node',
                root: fileURLToPath(new URL('./', import.meta.url)),
            },
        }),
    ),
)
