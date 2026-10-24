import { describe, expect, it, vi } from 'vitest'

const error = vi.fn()
vi.mock('#logger', () => ({ default: { error, warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

// A pg.Pool emits 'error' when PostgreSQL drops an idle connection (restart,
// failover). Without a listener Node turns it into an uncaughtException and the
// server stops; /ready must answer 503 instead (found during feat-030).
describe('PostgreSQL pool', () => {
    it('handles idle-client errors instead of crashing the process', async () => {
        const { pool } = await import('./db.js')
        const dropped = new Error('terminating connection due to administrator command')

        expect(pool.listenerCount('error')).toBeGreaterThan(0)
        expect(() => pool.emit('error', dropped)).not.toThrow()
        expect(error).toHaveBeenCalledWith(
            expect.objectContaining({ err: dropped }),
            'PostgreSQL pool: idle client error',
        )
        await pool.end()
    })
})
