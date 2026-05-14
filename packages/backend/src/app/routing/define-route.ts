import type { Type } from "@arktype/type";

import { defaultValidator } from "#app/validate/index.js";
import type { HttpHandler, RouteConfig, RouteItem } from "#vendor/types/types.js";

type InferSchema<TSchema> = TSchema extends Type<infer T> ? T : unknown;

/**
 * Infers query type from optional schema:
 *  - schema provided → schema's output;
 *  - undefined       → null (matches runtime `httpData.query === null`).
 */
type InferQueryFromSchema<TSchema> = TSchema extends Type<infer T> ? T : null;

type DefineRouteInput<
  TBody extends Type | undefined,
  TQuery extends Type | undefined,
> = Omit<RouteConfig, "validator" | "queryValidator"> & {
  validator?: TBody;
  queryValidator?: TQuery;
  queryAllowExtra?: boolean;
  queryArrays?: readonly string[];
  handler: HttpHandler<InferSchema<TBody>, InferQueryFromSchema<TQuery>>;
};

/**
 * Wraps an ArkType schema for query validation:
 *  - by default applies '+': 'reject' (strict — undeclared keys → 422);
 *  - when `allowExtra` is true, applies '+': 'delete' (loose+strip —
 *    undeclared keys pass validation but are removed from output).
 *
 * Implementation uses ArkType's `onUndeclaredKey` API so morphs/defaults are
 * preserved while only the extra-key policy changes.
 */
const applyStrictPolicy = <T>(
  schema: Type<T>,
  allowExtra: boolean,
): Type<T> =>
  schema.onUndeclaredKey(allowExtra ? "delete" : "reject") as unknown as Type<T>;

export function defineRoute<
  TBody extends Type | undefined = undefined,
  TQuery extends Type | undefined = undefined,
>(config: DefineRouteInput<TBody, TQuery>): RouteItem {
  const wrappedQueryValidator =
    config.queryValidator !== undefined
      ? defaultValidator(
          applyStrictPolicy(
            config.queryValidator,
            config.queryAllowExtra === true,
          ),
        )
      : undefined;

  return {
    ...config,
    validator:
      config.validator !== undefined
        ? defaultValidator(config.validator)
        : undefined,
    queryValidator: wrappedQueryValidator,
  } as RouteItem;
}
