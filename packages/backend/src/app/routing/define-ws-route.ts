import type { Type } from '@arktype/type'

import { defaultValidator } from '#app/validate/index.js'
import type {
    RouteConfig,
    RouteItem,
    TypedHandler,
    WsContext,
    WsHandler,
} from '#vendor/types/types.js'
import type { RouteResponse } from '#app/routing/route-response.js'

type InferSchema<TSchema> = TSchema extends Type<infer T> ? T : unknown

type DefineWsRouteInput<TSchema extends Type | undefined, TRes extends Type | undefined> = Omit<
    RouteConfig,
    'method' | 'validator' | 'ResponseSchema'
> & {
    validator?: TSchema
    ResponseSchema?: TRes
    handler: TypedHandler<WsContext<InferSchema<TSchema>>, RouteResponse<TRes>>
}

export function defineWsRoute<
    TSchema extends Type | undefined,
    TRes extends Type | undefined = undefined,
>(config: DefineWsRouteInput<TSchema, TRes>): RouteItem {
    return {
        method: 'ws',
        ...config,
        validator: config.validator !== undefined ? defaultValidator(config.validator) : undefined,
        // RouteItem erases the handler type anyway; the result check only matters on input.
        handler: config.handler as WsHandler<InferSchema<TSchema>>,
    }
}
