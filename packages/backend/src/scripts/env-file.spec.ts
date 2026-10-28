import { describe, expect, it } from 'vitest'
import { readEnvValue, upsertEnvValues } from './env-file.js'

describe('readEnvValue', () => {
    it('reads quoted and unquoted values', () => {
        const content = 'A="one"\nB=two\nC=\n'
        expect(readEnvValue(content, 'A')).toBe('one')
        expect(readEnvValue(content, 'B')).toBe('two')
        expect(readEnvValue(content, 'C')).toBe('')
    })

    it('returns empty string for a missing key', () => {
        expect(readEnvValue('A=1\n', 'B')).toBe('')
    })

    it('does not match a key that only shares a prefix', () => {
        expect(readEnvValue('VAPID_PUBLIC_KEY_OLD="x"\n', 'VAPID_PUBLIC_KEY')).toBe('')
    })
})

describe('upsertEnvValues', () => {
    it('replaces existing lines in place and keeps the rest', () => {
        const content = '# push\nVAPID_PUBLIC_KEY=""\nVAPID_PRIVATE_KEY=""\nOTHER=1\n'
        expect(
            upsertEnvValues(content, { VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' }),
        ).toBe('# push\nVAPID_PUBLIC_KEY="pub"\nVAPID_PRIVATE_KEY="priv"\nOTHER=1\n')
    })

    it('appends missing keys, adding a newline when the file lacks one', () => {
        expect(upsertEnvValues('OTHER=1', { VAPID_PUBLIC_KEY: 'pub' })).toBe(
            'OTHER=1\nVAPID_PUBLIC_KEY="pub"\n',
        )
        expect(upsertEnvValues('', { A: 'x' })).toBe('A="x"\n')
    })
})
