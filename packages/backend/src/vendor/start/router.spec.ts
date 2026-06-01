import { describe, expect, it } from "vitest";

import { defineRoute } from "#app/routing/define-route.js";
import type { routeList } from "#vendor/types/types.js";
import { routesHandler } from "./router.js";

describe("routesHandler", () => {
  it("does not mutate source route definitions while flattening groups", () => {
    const loginRoute = defineRoute({
      url: "/login",
      method: "post",
      middlewares: ["route_middleware"],
      handler: () => ({ ok: true }),
    });
    const routes = [
      {
        group: [loginRoute],
        description: "Auth routes",
        middlewares: ["group_middleware"],
        prefix: "auth",
      },
    ] satisfies routeList;

    const firstResult = routesHandler(routes);
    const secondResult = routesHandler(routes);

    expect(loginRoute.url).toBe("/login");
    expect(loginRoute.middlewares).toEqual(["route_middleware"]);
    expect(loginRoute.groupRateLimit).toBeUndefined();

    expect(firstResult[0]?.url).toBe(secondResult[0]?.url);
    expect(firstResult[0]?.url).toMatch(/\/auth\/login$/);
    expect(firstResult[0]?.middlewares).toEqual([
      "group_middleware",
      "route_middleware",
    ]);
  });
});
