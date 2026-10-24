import { type } from '@arktype/type'
import { describe, expect, it } from 'vitest'

import { defineRoute } from '#app/routing/define-route.js'
import { LoginInputSchema } from 'shared/schemas'
import { CanonicalErrorResponseSchema } from 'shared/responses'
import { defineWsRoute } from '#app/routing/define-ws-route.js'
import appConfig from '#config/app.js'
import { serializeRoutes } from './serialize-routes.js'

interface JsonSchemaForTest {
    anyOf?: JsonSchemaForTest[]
    properties?: Record<string, unknown>
    required?: string[]
}

interface SerializedSchemaForTest {
    expression?: unknown
    fields?: unknown[]
    jsonSchema?: JsonSchemaForTest
}

function getSerializedSchema(
    route: Record<string, unknown>,
    key: 'inputSchema' | 'outputSchema',
): SerializedSchemaForTest {
    const schema = route[key] as SerializedSchemaForTest | undefined
    expect(schema).toBeDefined()
    return schema!
}

describe('serializeRoutes', () => {
    it('extracts inputSchema through validator.describe()', () => {
        const schema = type({
            email: 'string.email',
        })

        const routes = [
            defineRoute({
                url: '/login',
                method: 'post',
                validator: schema,
                handler: () => ({ ok: true }),
            }),
        ]

        const [result] = serializeRoutes(routes) as Record<string, unknown>[]
        expect(result).toBeDefined()

        expect(result?.['validator']).toBeUndefined()
        expect(result?.['handler']).toBeNull()
        expect(result?.['inputSchema']).toMatchObject({
            expression: expect.any(String),
            fields: expect.any(Array),
            jsonSchema: expect.objectContaining({
                type: 'object',
                properties: expect.any(Object),
            }),
        })
    })

    it('serializes union request schemas through JSON Schema anyOf', () => {
        const routes = [
            defineRoute({
                url: '/login',
                method: 'post',
                validator: LoginInputSchema,
                handler: () => ({ ok: true }),
            }),
        ]

        const [result] = serializeRoutes(routes) as Record<string, unknown>[]
        expect(result).toBeDefined()

        const inputSchema = getSerializedSchema(result!, 'inputSchema')
        expect(inputSchema.expression).toEqual(expect.any(String))
        expect(inputSchema.fields).toHaveLength(0)
        expect(inputSchema.jsonSchema?.anyOf).toHaveLength(2)

        const branchProperties =
            inputSchema.jsonSchema?.anyOf?.map((branch) => Object.keys(branch.properties ?? {})) ??
            []

        expect(branchProperties.some((keys) => keys.includes('email'))).toBe(true)
        expect(branchProperties.some((keys) => keys.includes('identifier'))).toBe(true)
    })

    it('serializes union response schemas through JSON Schema anyOf', () => {
        const successSchema = type({
            status: "'success'",
            message: 'string',
        })

        const routes = [
            defineRoute({
                url: '/register',
                method: 'post',
                ResponseSchema: type.or(successSchema, CanonicalErrorResponseSchema),
                handler: () => ({ ok: true }),
            }),
        ]

        const [result] = serializeRoutes(routes) as Record<string, unknown>[]
        expect(result).toBeDefined()

        const outputSchema = getSerializedSchema(result!, 'outputSchema')
        expect(outputSchema.expression).toEqual(expect.any(String))
        expect(outputSchema.fields).toHaveLength(0)
        expect(outputSchema.jsonSchema?.anyOf).toHaveLength(2)

        const statusSchemas =
            outputSchema.jsonSchema?.anyOf?.map(
                (branch) => branch.properties?.['status'] as { const?: unknown } | undefined,
            ) ?? []

        expect(statusSchemas).toContainEqual(expect.objectContaining({ const: 'success' }))
        expect(statusSchemas).toContainEqual(expect.objectContaining({ const: 'error' }))
    })

    it('keeps non-union response schema fields', () => {
        const responseSchema = type({
            status: "'ok'",
            message: 'string',
        })

        const routes = [
            defineRoute({
                url: '/ping',
                method: 'get',
                ResponseSchema: responseSchema,
                handler: () => ({ ok: true }),
            }),
        ]

        const [result] = serializeRoutes(routes) as Record<string, unknown>[]
        expect(result).toBeDefined()

        const outputSchema = getSerializedSchema(result!, 'outputSchema')
        expect(outputSchema.fields).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'status', required: true }),
                expect.objectContaining({ name: 'message', required: true }),
            ]),
        )
    })

    it('omits inputSchema when validator is absent', () => {
        const routes = [
            defineRoute({
                url: '/ping',
                method: 'get',
                handler: () => ({ ok: true }),
            }),
        ]

        const [result] = serializeRoutes(routes) as Record<string, unknown>[]
        expect(result).toBeDefined()

        expect(result?.['inputSchema']).toBeUndefined()
    })

    it('omits inputSchema for validators with non-ArkType describe() output', () => {
        const routes = [
            {
                url: '/native',
                method: 'post',
                handler: () => ({ ok: true }),
                validator: {
                    validate: () => ({ ok: true, value: { ok: true } }),
                    describe: () => ({ kind: 'predicate' }),
                },
            },
        ]

        const [result] = serializeRoutes(routes) as Record<string, unknown>[]
        expect(result).toBeDefined()
        expect(result?.['inputSchema']).toBeUndefined()
    })
})

describe('serializeRoutes bodyLimits', () => {
    const handler = () => ({})
    const json = { kind: 'json', maxBytes: appConfig.maxJsonBodySize }
    const multipart = { kind: 'multipart', maxBytes: appConfig.maxMultipartBodySize }
    const bodyLimitsOf = (route: unknown): unknown =>
        (serializeRoutes([route])[0] as Record<string, unknown>)['bodyLimits']

    it.each(['post', 'put', 'patch'] as const)(
        '%s without allowedContentTypes → the JSON limit',
        (method) => {
            expect(bodyLimitsOf(defineRoute({ url: '/x', method, handler }))).toEqual([json])
        },
    )

    it('lists each allowed type in order', () => {
        expect(
            bodyLimitsOf(
                defineRoute({
                    url: '/x',
                    method: 'post',
                    allowedContentTypes: ['multipart'],
                    handler,
                }),
            ),
        ).toEqual([multipart])
        expect(
            bodyLimitsOf(
                defineRoute({
                    url: '/x',
                    method: 'post',
                    allowedContentTypes: ['json', 'multipart'],
                    handler,
                }),
            ),
        ).toEqual([json, multipart])
    })

    it('allowedContentTypes: [] → an empty list', () => {
        expect(
            bodyLimitsOf(
                defineRoute({ url: '/x', method: 'post', allowedContentTypes: [], handler }),
            ),
        ).toEqual([])
    })

    it.each(['get', 'delete'] as const)('%s has no bodyLimits', (method) => {
        expect(bodyLimitsOf(defineRoute({ url: '/x', method, handler }))).toBeUndefined()
    })

    it('a WS route has no bodyLimits', () => {
        expect(bodyLimitsOf(defineWsRoute({ url: 'x', handler }))).toBeUndefined()
    })

    it('is set on routes inside nested groups', () => {
        const [group] = serializeRoutes([
            { group: [{ group: [defineRoute({ url: '/x', method: 'patch', handler })] }] },
        ]) as { group: { group: Record<string, unknown>[] }[] }[]

        expect(group?.group[0]?.group[0]?.['bodyLimits']).toEqual([json])
    })
})
