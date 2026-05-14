import { type } from "@arktype/type";
import { describe, expect, it } from "vitest";

import { defineRoute } from "./define-route.js";
import { defineWsRoute } from "./define-ws-route.js";

describe("defineRoute", () => {
  it("wraps the input schema with the default validator", () => {
    const schema = type({
      email: "string.email",
    });

    const route = defineRoute({
      url: "/login",
      method: "post",
      validator: schema,
      handler: () => ({ ok: true }),
    });

    expect(route.validator).toBeDefined();
    expect(route.validator?.describe?.()).toBe(schema);
    expect(route.validator?.validate({ email: "user@example.com" })).toEqual({
      ok: true,
      value: { email: "user@example.com" },
    });
  });

  it("leaves validator undefined when route has no schema", () => {
    const route = defineRoute({
      url: "/ping",
      method: "get",
      handler: () => ({ ok: true }),
    });

    expect(route.validator).toBeUndefined();
  });

  it("wraps queryValidator in strict mode by default", () => {
    const schema = type({
      page: "string.integer.parse",
    });

    const route = defineRoute({
      url: "/items",
      method: "get",
      queryValidator: schema,
      handler: () => ({ ok: true }),
    });

    expect(route.queryValidator).toBeDefined();
    expect(route.queryValidator?.validate({ page: "1" })).toEqual({
      ok: true,
      value: { page: 1 },
    });
    expect(route.queryValidator?.validate({ page: "1", extra: "x" })).toMatchObject({
      ok: false,
    });
  });

  it("supports queryAllowExtra as loose plus strip", () => {
    const schema = type({
      page: "string.integer.parse",
    });

    const route = defineRoute({
      url: "/items",
      method: "get",
      queryValidator: schema,
      queryAllowExtra: true,
      handler: () => ({ ok: true }),
    });

    expect(route.queryValidator?.validate({ page: "1", extra: "x" })).toEqual({
      ok: true,
      value: { page: 1 },
    });
  });
});

describe("defineWsRoute", () => {
  it("wraps websocket route schemas through the same validator wrapper", () => {
    const schema = type({
      roomId: "string",
    });

    const route = defineWsRoute({
      url: "join_room",
      validator: schema,
      handler: () => ({ ok: true }),
    });

    expect(route.method).toBe("ws");
    expect(route.validator?.describe?.()).toBe(schema);
  });
});
