import { describe, expect, it } from 'vitest'

import { RedisUnavailableError, isRedisUnavailable } from './redis-unavailable-error.js'

const withCode = (code: string): Error =>
    Object.assign(new Error(`connect ${code} 127.0.0.1:6379`), { code })
const named = (name: string, message: string): Error => Object.assign(new Error(message), { name })

describe('isRedisUnavailable', () => {
    it.each([
        ['commandTimeout', new Error('Command timed out')],
        ['dropped connection', new Error('Connection is closed.')],
        [
            'offline queue disabled',
            new Error("Stream isn't writeable and enableOfflineQueue options is false"),
        ],
        [
            'MaxRetriesPerRequestError',
            named(
                'MaxRetriesPerRequestError',
                'Reached the max retries per request limit (which is 20).',
            ),
        ],
        ['ECONNREFUSED', withCode('ECONNREFUSED')],
        ['ECONNRESET', withCode('ECONNRESET')],
        ['already wrapped', new RedisUnavailableError()],
    ])('%s → true', (_, err) => {
        expect(isRedisUnavailable(err)).toBe(true)
    })

    it.each([
        [
            'WRONGTYPE',
            named(
                'ReplyError',
                'WRONGTYPE Operation against a key holding the wrong kind of value',
            ),
        ],
        ['Lua error', named('ReplyError', 'ERR Error running script (call to f_x): oops')],
        ['SyntaxError', new SyntaxError('Unexpected token')],
        ['a reply error quoting a timeout', named('ReplyError', 'Command timed out')],
        ['not an Error', 'Command timed out'],
    ])('%s → false', (_, err) => {
        expect(isRedisUnavailable(err)).toBe(false)
    })
})

describe('RedisUnavailableError', () => {
    it('is a 503 service_unavailable that keeps the cause', () => {
        const cause = new Error('Command timed out')
        const err = new RedisUnavailableError('Redis command failed', { cause })
        expect(err.statusCode).toBe(503)
        expect(err.code).toBe('service_unavailable')
        expect(err.name).toBe('RedisUnavailableError')
        expect(err.cause).toBe(cause)
    })
})
