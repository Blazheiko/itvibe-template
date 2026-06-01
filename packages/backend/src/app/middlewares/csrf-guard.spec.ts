import { beforeEach, describe, expect, it, vi } from "vitest";

import csrfGuard from "./csrf-guard.js";
import type { HttpContext } from "#vendor/types/types.js";
import csrfConfig from "#config/csrf.js";

const VALID_CSRF_TOKEN = "a".repeat(43);

vi.mock("#config/csrf.js", () => ({
  default: {
    enforce: true,
    strictOrigin: false,
    allowedOrigins: ["https://app.example.com"],
    headerName: "x-csrf-token",
  },
}));

const createContext = (overrides: Partial<HttpContext> = {}): HttpContext => {
  const context = {
    requestId: "request-id",
    logger: {
      warn: vi.fn(),
    },
    httpData: {
      method: "post",
      ip: "127.0.0.1",
      params: {},
      payload: {},
      query: null,
      headers: new Map<string, string>([
        ["origin", "https://app.example.com"],
        ["x-csrf-token", VALID_CSRF_TOKEN],
      ]),
      contentType: "application/json",
      cookies: new Map(),
      isJson: true,
      files: null,
      hasFile: vi.fn(() => false),
    },
    responseData: {
      aborted: false,
      payload: null,
      middlewareData: {},
      headers: [],
      cookies: new Map(),
      status: 200,
      deleteCookie: vi.fn(),
      setCookie: vi.fn(),
      setHeader: vi.fn(),
    },
    session: {
      sessionInfo: {
        id: "session-id",
        data: {
          csrfToken: VALID_CSRF_TOKEN,
        },
        createdAt: new Date().toISOString(),
      },
      updateSessionData: vi.fn(),
      changeSessionData: vi.fn(),
      destroySession: vi.fn(),
      destroyAllSessions: vi.fn(),
    },
    auth: {
      getUserId: vi.fn(() => "7"),
      check: vi.fn(() => true),
      login: vi.fn(),
      logout: vi.fn(),
      logoutAll: vi.fn(),
    },
  } as unknown as HttpContext;

  return {
    ...context,
    ...overrides,
  };
};

describe("csrfGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (csrfConfig as { enforce: boolean }).enforce = true;
  });

  it("allows safe methods without a token", async () => {
    const context = createContext();
    context.httpData.method = "get";
    context.httpData.headers.delete("x-csrf-token");
    const next = vi.fn();

    await csrfGuard(context, next);

    expect(next).toHaveBeenCalledOnce();
    expect(context.responseData.status).toBe(200);
  });

  it("allows OPTIONS preflight without a token", async () => {
    const context = createContext();
    context.httpData.method = "options";
    context.httpData.headers.delete("x-csrf-token");
    const next = vi.fn();

    await csrfGuard(context, next);

    expect(next).toHaveBeenCalledOnce();
    expect(context.responseData.status).toBe(200);
  });

  it("rejects unsafe methods without a token", async () => {
    const context = createContext();
    context.httpData.headers.delete("x-csrf-token");
    const next = vi.fn();

    await csrfGuard(context, next);

    expect(next).not.toHaveBeenCalled();
    expect(context.responseData.status).toBe(403);
    expect(context.responseData.payload).toMatchObject({
      status: "error",
      code: "csrf_invalid",
      reason: "token_mismatch",
    });
  });

  it("rejects wrong tokens without throwing on unequal lengths", async () => {
    const context = createContext();
    context.httpData.headers.set("x-csrf-token", "wrong");
    const next = vi.fn();

    await csrfGuard(context, next);

    expect(next).not.toHaveBeenCalled();
    expect(context.responseData.status).toBe(403);
  });

  it("rejects oversized submitted tokens before timing-safe comparison", async () => {
    const context = createContext();
    context.httpData.headers.set("x-csrf-token", "a".repeat(1024));
    const next = vi.fn();

    await csrfGuard(context, next);

    expect(next).not.toHaveBeenCalled();
    expect(context.responseData.status).toBe(403);
    expect(context.responseData.payload).toMatchObject({
      reason: "token_mismatch",
    });
  });

  it("allows matching tokens", async () => {
    const context = createContext();
    const next = vi.fn();

    await csrfGuard(context, next);

    expect(next).toHaveBeenCalledOnce();
    expect(context.responseData.status).toBe(200);
  });

  it("lets downstream auth handling decide when session is absent", async () => {
    const context = createContext({
      session: {
        ...createContext().session,
        sessionInfo: null,
      },
    });
    const next = vi.fn();

    await csrfGuard(context, next);

    expect(next).toHaveBeenCalledOnce();
    expect(context.responseData.status).toBe(200);
  });

  it("rejects origin mismatches", async () => {
    const context = createContext();
    context.httpData.headers.set("origin", "https://evil.example.com");
    const next = vi.fn();

    await csrfGuard(context, next);

    expect(next).not.toHaveBeenCalled();
    expect(context.responseData.status).toBe(403);
    expect(context.responseData.payload).toMatchObject({
      reason: "origin_mismatch",
    });
  });

  it("reports and allows mismatches when enforcement is disabled", async () => {
    (csrfConfig as { enforce: boolean }).enforce = false;
    const context = createContext();
    context.httpData.headers.delete("x-csrf-token");
    const next = vi.fn();

    await csrfGuard(context, next);

    expect(next).toHaveBeenCalledOnce();
    expect(context.responseData.status).toBe(200);
    expect(context.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "token_mismatch",
        csrfEnforce: false,
      }),
      "CSRF validation failed",
    );
  });
});
