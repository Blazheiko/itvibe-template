import type { ESBuildOptions } from 'vite'

// Production bundles must not print to the browser console: logs can carry
// tokens and user data. esbuild treats these calls as side-effect free and the
// minifier removes them; dev transforms do not minify, so dev keeps its logs.
// console.warn / console.error stay: they signal failures.
export const stripConsoleLogs: ESBuildOptions = {
    pure: ['console.log', 'console.info', 'console.debug', 'console.trace'],
}
