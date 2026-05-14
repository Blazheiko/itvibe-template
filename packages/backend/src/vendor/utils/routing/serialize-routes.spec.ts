import { type } from "@arktype/type";
import { describe, expect, it } from "vitest";

import { defineRoute } from "#app/routing/define-route.js";
import { serializeRoutes } from "./serialize-routes.js";

describe("serializeRoutes", () => {
  it("extracts inputSchema through validator.describe()", () => {
    const schema = type({
      email: "string.email",
    });

    const routes = [
      defineRoute({
        url: "/login",
        method: "post",
        validator: schema,
        handler: () => ({ ok: true }),
      }),
    ];

    const [result] = serializeRoutes(routes) as Record<string, unknown>[];
    expect(result).toBeDefined();

    expect(result?.["validator"]).toBeUndefined();
    expect(result?.["handler"]).toBeNull();
    expect(result?.["inputSchema"]).toMatchObject({
      expression: expect.any(String),
      fields: expect.any(Array),
    });
  });

  it("omits inputSchema when validator is absent", () => {
    const routes = [
      defineRoute({
        url: "/ping",
        method: "get",
        handler: () => ({ ok: true }),
      }),
    ];

    const [result] = serializeRoutes(routes) as Record<string, unknown>[];
    expect(result).toBeDefined();

    expect(result?.["inputSchema"]).toBeUndefined();
  });

  it("omits inputSchema for validators with non-ArkType describe() output", () => {
    const routes = [
      {
        url: "/native",
        method: "post",
        handler: () => ({ ok: true }),
        validator: {
          validate: () => ({ ok: true, value: { ok: true } }),
          describe: () => ({ kind: "predicate" }),
        },
      },
    ];

    const [result] = serializeRoutes(routes) as Record<string, unknown>[];
    expect(result).toBeDefined();
    expect(result?.["inputSchema"]).toBeUndefined();
  });
});
