import { describe, expect, it } from 'vitest'

import { DATABASE_DEFAULTS, resolveDatabaseConfig } from './database.js'

describe('resolveDatabaseConfig', () => {
    it('falls back to defaults when nothing is set', () => {
        expect(resolveDatabaseConfig({})).toEqual(DATABASE_DEFAULTS)
    })

    it('treats empty values as unset', () => {
        expect(resolveDatabaseConfig({ PGSQL_PORT: '', PGSQL_HOST: ' ' })).toMatchObject({
            host: '127.0.0.1',
            port: 5432,
        })
    })

    it('reads PGSQL_* values', () => {
        expect(
            resolveDatabaseConfig({
                PGSQL_HOST: 'db',
                PGSQL_PORT: '6543',
                PGSQL_USER: 'app',
                PGSQL_PASSWORD: 'secret',
                PGSQL_DB_NAME: 'app_db',
            }),
        ).toEqual({
            client: 'pg',
            host: 'db',
            port: 6543,
            user: 'app',
            password: 'secret',
            database: 'app_db',
        })
    })

    it.each(['abc', '0', '70000', '54.3'])('rejects PGSQL_PORT=%s', (port) => {
        expect(() => resolveDatabaseConfig({ PGSQL_PORT: port })).toThrow(/PGSQL_PORT/)
    })
})
