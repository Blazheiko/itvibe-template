import type { Type } from "@arktype/type";
import {
  serializeArkSchema,
  type SerializedArkSchema,
} from "#vendor/utils/tooling/serialize-ark-schema.js";
import {
  resolveMaxBodySize,
  type BodyKind,
} from "#vendor/utils/network/http-request-handlers.js";
import { isBodyMethod } from "#vendor/utils/routing/body-methods.js";
import type { Method } from "#vendor/types/types.js";

function isArkType(value: unknown): value is Type {
  if (value === null || value === undefined) return false;
  if (typeof value !== "object" && typeof value !== "function") return false;
  return (
    "expression" in value &&
    "json" in value &&
    typeof value.expression === "string"
  );
}

function getArkTypeDescription(value: unknown): Type | undefined {
  const described = (
    value as
      | {
          describe?: () => unknown;
        }
      | undefined
  )?.describe?.();

  if (!isArkType(described)) {
    // TODO(validation-docs): support non-ArkType describe() payloads such as
    // predicate/native validators without losing route-doc serialization.
    return undefined;
  }

  return described;
}

type SerializedRouteItem = Record<string, unknown> & {
  handler: null;
  validator: undefined;
  queryValidator: undefined;
  ResponseSchema: undefined;
  inputSchema?: SerializedArkSchema;
  /**
   * Query schema serialized separately from `inputSchema` so the api-playground
   * UI can render request body and query string as distinct sections.
   */
  querySchema?: SerializedArkSchema;
  outputSchema?: SerializedArkSchema;
  /**
   * Body size limit per allowed content type (the limit depends on the request
   * Content-Type, not on the route). Only routes that read a body have it;
   * `[]` means `allowedContentTypes: []` — no body type is allowed.
   */
  bodyLimits?: { kind: BodyKind; maxBytes: number }[];
};

/**
 * Serializes routes for the doc endpoint:
 * - Removes handler function references
 * - Extracts ArkType validator → inputSchema { expression, fields[] }
 * - Extracts ArkType ResponseSchema → outputSchema { expression, fields[] }
 * - Adds bodyLimits for post/put/patch routes
 * - Supports unlimited nesting of groups
 */
export function serializeRoutes(routes: unknown[]): unknown[] {
  return routes.map((item: unknown) => {
    if (typeof item !== "object" || item === null) return item;
    const obj = item as Record<string, unknown>;

    // Group container — recurse into nested routes
    if (Array.isArray(obj["group"])) {
      return {
        ...obj,
        validator: undefined,
        queryValidator: undefined,
        ResponseSchema: undefined,
        group: serializeRoutes(obj["group"] as unknown[]),
      };
    }

    // Route item — extract schema info and null out non-serializable fields
    const result: SerializedRouteItem = {
      ...obj,
      handler: null,
      validator: undefined,
      queryValidator: undefined,
      ResponseSchema: undefined,
    };

    const nativeValidator = getArkTypeDescription(obj["validator"]);
    if (isArkType(nativeValidator)) {
      result.inputSchema = serializeArkSchema(nativeValidator);
    }

    const nativeQueryValidator = getArkTypeDescription(obj["queryValidator"]);
    if (isArkType(nativeQueryValidator)) {
      result.querySchema = serializeArkSchema(nativeQueryValidator);
    }

    if (typeof obj["method"] === "string" && isBodyMethod(obj["method"] as Method)) {
      // Same default as readAndParseBody.
      const allowed = (obj["allowedContentTypes"] as BodyKind[] | undefined) ?? ["json"];
      result.bodyLimits = allowed.map((kind) => ({
        kind,
        maxBytes: resolveMaxBodySize(kind),
      }));
    }

    if (isArkType(obj["ResponseSchema"])) {
      result.outputSchema = serializeArkSchema(obj["ResponseSchema"]);
    }

    return result;
  });
}
