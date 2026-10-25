import { test } from 'node:test'
import assert from 'node:assert/strict'

import { WS_CHANNELS, isWsChannel } from '../dist/guards/index.js'

test('isWsChannel accepts every declared channel', () => {
    for (const channel of WS_CHANNELS) {
        assert.equal(isWsChannel(channel), true)
    }
})

test('isWsChannel rejects unknown and non-string values', () => {
    for (const value of ['', 'Admin', 'admin ', 'user:1', '#', '*', 1, null, undefined, {}]) {
        assert.equal(isWsChannel(value), false, String(value))
    }
})
