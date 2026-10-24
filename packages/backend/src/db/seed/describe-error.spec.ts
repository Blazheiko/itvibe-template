import { drizzle } from 'drizzle-orm/node-postgres'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { describeSeedError, reportSeedFailure } from './describe-error.js'
import { createDrizzleSeedStore } from './drizzle-seed-store.js'
import { runSeed } from './run-seed.js'

const ADMIN_EMAIL = 'secret-admin@example.test'
const PASSWORD_HASH = '$scrypt$N=16384,r=8,p=1,maxmem=33554432$c2FsdA==$aGFzaA=='

// pg rejects the users insert the way PostgreSQL does on a unique violation:
// `detail` and `message` may quote the offending values.
function createFailingClient() {
    const pgError = Object.assign(
        new Error(`duplicate key value violates unique constraint, value ${ADMIN_EMAIL}`),
        {
            name: 'error',
            code: '23505',
            constraint: 'users_email_unique_non_null_idx',
            table: 'users',
            detail: `Key (lower(email))=(${ADMIN_EMAIL}) already exists.`,
        },
    )
    const sentValues: unknown[] = []
    // Drizzle calls pg as client.query({ text, ... }, params).
    const query = vi.fn((config: { text: string }, values: unknown[] = []) => {
        if (config.text.startsWith('insert into "users"')) {
            sentValues.push(...values)
            return Promise.reject(pgError)
        }
        if (config.text.startsWith('insert into "llm_system_prompts"')) {
            return Promise.resolve({ rows: [[1n]], rowCount: 1, fields: [] })
        }
        return Promise.resolve({ rows: [], rowCount: 0, fields: [] })
    })
    return { client: { query }, sentValues }
}

async function captureSeedFailure(): Promise<{
    output: string
    sentValues: unknown[]
}> {
    const { client, sentValues } = createFailingClient()
    const db = drizzle({ client: client as never })
    const error = await runSeed(createDrizzleSeedStore(db), {
        demo: true,
        env: {
            SEED_ADMIN_EMAIL: ADMIN_EMAIL,
            SEED_ADMIN_PASSWORD: 'plain-password',
        },
        hashPassword: () => Promise.resolve(PASSWORD_HASH),
    }).then(
        () => undefined,
        (err: unknown) => err,
    )
    expect(error).toBeDefined()

    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    reportSeedFailure(error)
    const output = spy.mock.calls.flat().map(String).join('\n')
    return { output, sentValues }
}

describe('reportSeedFailure', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('never prints query params, detail or message of a failed insert', async () => {
        const { output, sentValues } = await captureSeedFailure()

        // The Drizzle error really carried the sensitive values (sessionToken: nanoid(), 21 chars).
        const sessionToken = sentValues.find((v) => typeof v === 'string' && /^[\w-]{21}$/.test(v))
        expect(sentValues).toContain(PASSWORD_HASH)
        expect(sessionToken).toBeDefined()

        expect(output).not.toContain(ADMIN_EMAIL)
        expect(output).not.toContain(PASSWORD_HASH)
        expect(output).not.toContain('$scrypt$')
        expect(output).not.toContain(String(sessionToken))
        expect(output).not.toContain('plain-password')
        expect(output).not.toContain('params')
    })

    it('keeps the structural fields that explain the failure', async () => {
        const { output } = await captureSeedFailure()

        expect(output).toContain('Seed failed, nothing was written')
        expect(output).toContain('DrizzleQueryError')
        expect(output).toContain('code=23505')
        expect(output).toContain('constraint=users_email_unique_non_null_idx')
        expect(output).toContain('table=users')
    })
})

describe('describeSeedError', () => {
    it('keeps the message of Node system errors such as a refused connection', () => {
        const err = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), {
            code: 'ECONNREFUSED',
        })
        expect(describeSeedError(err)).toBe(
            'Error code=ECONNREFUSED connect ECONNREFUSED 127.0.0.1:5432',
        )
    })

    it('drops the message of other errors', () => {
        expect(describeSeedError(new TypeError(`bad value ${ADMIN_EMAIL}`))).toBe('TypeError')
        expect(describeSeedError('oops')).toBe('non-Error value thrown')
    })
})
