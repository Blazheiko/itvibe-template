import type { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  cleanupTestRedis,
  createTestRedis,
  hasRedis,
} from "../../../test-support/redis-test-client.js";

// The route chain of POST /api/auth/logout-all: session_web → csrf_guard →
// auth_guard → AuthController.logoutAll, on the production main-client contract
// against a real Redis. A run stopped by Redis must leave the client able to
// repeat the request: still authenticated and with a valid CSRF token.

const { PREFIX } = vi.hoisted(() => {
  process.env["APP_KEY"] ??= "k".repeat(16) + "3f9a1c7e5b2d4f60";
  process.env["CSRF_ENFORCE"] = "true";
  return { PREFIX: `test:${crypto.randomUUID()}:` };
});

const silent = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
vi.mock("#logger", () => ({ default: { ...silent, child: () => silent } }));
vi.mock("#vendor/utils/logger.js", () => ({
  default: { ...silent, child: () => silent },
}));
vi.mock("#config/redis.js", async (importActual) => {
  const actual = await importActual<{ default: object }>();
  return { default: { ...actual.default, keyPrefix: PREFIX } };
});
vi.mock("#database/redis.js", async () => {
  const { Redis: Client } = await import("ioredis");
  const { mainRedisOptions } = await import("#database/redis-main-options.js");
  const { createRedisHealth, createWithRedis } = await import(
    "#database/redis-health.js"
  );
  const { host: _host, port: _port, ...contract } = mainRedisOptions;
  const client = new Client(
    process.env["REDIS_TEST_URL"] ?? "redis://127.0.0.1:6379",
    { ...contract, keyPrefix: PREFIX, lazyConnect: true },
  );
  const redisHealth = createRedisHealth(client, {
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  });
  return {
    default: client,
    redisHealth,
    withRedis: createWithRedis(client, redisHealth),
  };
});

const { default: client, redisHealth } = (await import(
  "#database/redis.js"
)) as unknown as {
  default: Redis;
  redisHealth: { stop(): void };
};
const storage = await import("./redis-session-storage.js");
const { createSignedToken } = await import("./token-handler.js");
const { default: sessionConfig } = await import("#config/session.js");
const { default: executeMiddlewares } = await import(
  "#vendor/utils/middlewares/core/execute-httpMiddlewares.js"
);
const { default: createContext } = await import(
  "#vendor/utils/context/http-context.js"
);
const { createResponseData } = await import(
  "#vendor/utils/network/response-data.js"
);
const { default: AuthController } = await import(
  "#app/controllers/http/auth/auth-controller.js"
);

const admin = createTestRedis(PREFIX);
const USER_TOKEN = "logoutAllRetryToken01";
const CSRF = "c".repeat(43);
const ROUTE_MIDDLEWARES = ["session_web", "csrf_guard", "auth_guard"];

const save = (id: string) =>
  storage.saveSession({
    id,
    data: { userId: "42", userToken: USER_TOKEN, csrfToken: CSRF },
    createdAt: new Date().toISOString(),
  });

const userSessions = async (): Promise<string[]> =>
  (await admin.keys(`${PREFIX}session:${USER_TOKEN}:*`)).sort();

/** Context of POST /api/auth/logout-all with the session cookie and CSRF header. */
const createRequest = () => {
  const cookie = createSignedToken(`${USER_TOKEN}.current`);
  const responseData = createResponseData();
  const context = createContext(
    {
      method: "post",
      ip: "127.0.0.1",
      params: {},
      payload: {},
      query: null,
      headers: new Map([["x-csrf-token", CSRF]]),
      contentType: "application/json",
      cookies: new Map([[sessionConfig.cookieName, cookie]]),
      isJson: true,
      files: null,
      hasFile: () => false,
    } as never,
    responseData,
  );
  return { context, responseData };
};

/** One request through the route's middleware chain and controller. */
const logoutAllRequest = async () => {
  const { context, responseData } = createRequest();
  const passed = await executeMiddlewares(ROUTE_MIDDLEWARES, context);
  const payload = passed
    ? await AuthController.logoutAll(context as never)
    : responseData.payload;
  return { passed, status: responseData.status, payload };
};

const pause = () => admin.call("CLIENT", "PAUSE", "10000", "WRITE");
const unpause = () => admin.call("CLIENT", "UNPAUSE");

beforeAll(async () => {
  if (!hasRedis) return;
  await admin.connect();
  await client.connect();
});
afterAll(async () => {
  if (!hasRedis) return;
  await unpause();
  await cleanupTestRedis(admin);
  redisHealth.stop();
  client.disconnect(false);
  await admin.quit();
});

describe.skipIf(!hasRedis)("logoutAll repeated after a stopped run", () => {
  it("the stopped run answers 503 and the repeat succeeds through the middleware chain", async () => {
    for (const id of ["phone", "tablet", "current", "laptop"]) await save(id);

    // Middleware (GETEX of the session) runs before the pause; the pause then
    // stops the first DEL of the cleanup loop.
    const { context, responseData } = createRequest();
    expect(await executeMiddlewares(ROUTE_MIDDLEWARES, context)).toBe(true);
    await pause();
    let first: unknown;
    try {
      first = await AuthController.logoutAll(context as never);
    } finally {
      await unpause();
    }
    expect(responseData.status).toBe(503);
    expect(first).toMatchObject({ code: "service_unavailable" });
    expect(first).not.toHaveProperty("deletedCount");
    // The caller's session survived the stop.
    expect(await userSessions()).toContain(
      `${PREFIX}session:${USER_TOKEN}:current`,
    );

    const repeat = await logoutAllRequest();

    expect(repeat.passed).toBe(true); // csrf_guard and auth_guard let it through
    expect(repeat.payload).toMatchObject({ status: "success" });
    expect(await userSessions()).toEqual([]);
    expect(await admin.exists(`logout_all:cursor:${USER_TOKEN}`)).toBe(0);
  });
});
