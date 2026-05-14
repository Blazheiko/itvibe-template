import type { Type } from "@arktype/type";

import { defaultValidator } from "#app/validate/index.js";
import type { RouteConfig, RouteItem, WsHandler } from "#vendor/types/types.js";

type InferSchema<TSchema> = TSchema extends Type<infer T> ? T : unknown;

type DefineWsRouteInput<TSchema extends Type | undefined> = Omit<
  RouteConfig,
  "method" | "validator"
> & {
  validator?: TSchema;
  handler: WsHandler<InferSchema<TSchema>>;
};

export function defineWsRoute<TSchema extends Type | undefined>(
  config: DefineWsRouteInput<TSchema>,
) : RouteItem {
  return {
    method: "ws",
    ...config,
    validator:
      config.validator !== undefined ? defaultValidator(config.validator) : undefined,
  } as RouteItem;
}
