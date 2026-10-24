import { healthRepository } from '#app/repositories/index.js'
import healthConfig from '#config/health.js'
import redis from '#database/redis.js'
import logger from '#logger'

type Dependency = 'database' | 'redis'

const withTimeout = async (check: () => Promise<unknown>, ms: number): Promise<void> => {
    let timer: NodeJS.Timeout | undefined
    try {
        await Promise.race([
            check(),
            new Promise((_resolve, reject) => {
                timer = setTimeout(() => {
                    reject(new Error(`timed out after ${String(ms)} ms`))
                }, ms)
            }),
        ])
    } finally {
        clearTimeout(timer)
    }
}

// Readiness (code-issues item 35): the instance can serve traffic only when
// PostgreSQL and Redis answer. /ping stays a pure liveness check.
export const readinessService = {
    async check(): Promise<{ ready: boolean }> {
        const ms = healthConfig.readinessTimeoutMs
        const checks: [Dependency, () => Promise<unknown>][] = [
            ['database', (): Promise<unknown> => healthRepository.pingDatabase()],
            ['redis', (): Promise<unknown> => redis.ping()],
        ]
        const results = await Promise.allSettled(checks.map(([, check]) => withTimeout(check, ms)))
        const failed = checks
            .filter((_, index) => results[index]?.status === 'rejected')
            .map(([name]) => name)
        if (failed.length > 0) {
            logger.warn(
                {
                    failed,
                    reasons: results
                        .filter((result) => result.status === 'rejected')
                        .map((result) => String(result.reason)),
                },
                'Readiness check failed',
            )
            return { ready: false }
        }
        return { ready: true }
    },
}
