import type { WSAdminUserOnlineUpsertPayload } from 'shared/schemas'

// Hand-written guards for broadcast payloads: importing the ArkType schemas at runtime
// pulls the whole ArkType engine into the bundle (and its `new Function` JIT probe
// shows up as a CSP violation). Keep each guard in sync with its schema in
// packages/shared/src/schemas/ws/.

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

// Mirrors EntityIdSchema (packages/shared/src/brands/ids.ts).
const ENTITY_ID = /^[1-9]\d*$/

const ADMIN_USER_ONLINE_UPSERT_KEYS = new Set([
    'id',
    'name',
    'email',
    'appType',
    'userAgent',
    'connectionsCount',
])

/** Same contract as WSAdminUserOnlineUpsertPayloadSchema, including `"+": "reject"`. */
export const isWSAdminUserOnlineUpsertPayload = (
    value: unknown,
): value is WSAdminUserOnlineUpsertPayload =>
    isObject(value) &&
    Object.keys(value).every((key) => ADMIN_USER_ONLINE_UPSERT_KEYS.has(key)) &&
    typeof value.id === 'string' &&
    ENTITY_ID.test(value.id) &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    (value.appType === 'web' || value.appType === 'pwa') &&
    typeof value.userAgent === 'string' &&
    typeof value.connectionsCount === 'number'
