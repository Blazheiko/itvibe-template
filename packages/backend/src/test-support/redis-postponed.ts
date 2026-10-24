import type { Redis } from 'ioredis'

import { sleep } from './redis-test-client.js'

// Under CLIENT PAUSE WRITE a postponed command may already be parsed out of the
// query buffer (qbuf=0), so qbuf is no signal. The client itself is: CLIENT LIST
// shows it blocked (`b` in flags) with the postponed command in `cmd`. Fallback
// for versions without the flag: blocked_clients in INFO clients grew and `cmd`
// matches.

export type PostponedSignal = 'flag' | 'blocked_clients'

const parseClientInfo = (line: string): Map<string, string> =>
    new Map(
        line
            .trim()
            .split(' ')
            .map((field) => {
                const at = field.indexOf('=')
                return [field.slice(0, at), field.slice(at + 1)] as [string, string]
            }),
    )

export const readBlockedClients = async (admin: Redis): Promise<number> => {
    const info = await admin.info('clients')
    const match = /blocked_clients:(\d+)/.exec(info)
    if (match?.[1] === undefined) throw new Error('INFO clients has no blocked_clients')
    return Number(match[1])
}

export interface WaitForPostponedOptions {
    /** blocked_clients before the operation; required for the fallback signal. */
    blockedBefore?: number
    /** Test-only: skip the primary signal to exercise the fallback. */
    signals?: readonly PostponedSignal[]
    timeoutMs?: number
}

/**
 * Resolves with the signal that proved `cmd` of client `clientId` is postponed
 * by a pause; throws with an explicit message when none shows up in time.
 */
export const waitForPostponed = async (
    admin: Redis,
    clientId: number,
    cmd: string,
    {
        blockedBefore,
        signals = ['flag', 'blocked_clients'],
        timeoutMs = 3_000,
    }: WaitForPostponedOptions = {},
): Promise<PostponedSignal> => {
    const deadline = Date.now() + timeoutMs
    let last = ''
    while (Date.now() < deadline) {
        const list = String(await admin.call('CLIENT', 'LIST', 'ID', String(clientId)))
        last = list.trim()
        const info = parseClientInfo(list)
        if (info.get('cmd') === cmd) {
            if (signals.includes('flag') && (info.get('flags') ?? '').includes('b')) {
                return 'flag'
            }
            if (
                signals.includes('blocked_clients') &&
                blockedBefore !== undefined &&
                (await readBlockedClients(admin)) > blockedBefore
            ) {
                return 'blocked_clients'
            }
        }
        await sleep(10)
    }
    throw new Error(
        `command ${cmd} of client ${String(clientId)} was not seen postponed within ${String(timeoutMs)} ms (signals: ${signals.join(', ')}); last CLIENT LIST: ${last}`,
    )
}
