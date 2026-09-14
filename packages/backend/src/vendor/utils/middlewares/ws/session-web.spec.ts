import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HttpContext, SessionInfo } from "#vendor/types/types.js";

const VALID_CSRF_TOKEN = "a".repeat(43);
const ROTATED_CSRF_TOKEN = "b".repeat(43);

const sessionHandlerMock = vi.hoisted(() => vi.fn());

vi.mock("#vendor/utils/session/session-handler.js", () => ({
  sessionHandler: sessionHandlerMock,
}));
vi.mock("#vendor/utils/session/resolve-session-cookie.js", () => ({
  resolveSessionCookie: () => ({ token: undefined, source: "current" }),
}));
vi.mock("#vendor/utils/session/delete-legacy-session-cookie.js", () => ({
  deleteLegacySessionCookie: vi.fn(),
}));

const { default: sessionWeb } = await import("./session-web.js");

const createContext = (sessionInfo: SessionInfo | null): HttpContext =>
  ({
    httpData: { cookies: new Map() },
    responseData: { payload: null, status: 200 },
    session: { sessionInfo },
  }) as unknown as HttpContext;

const createSession = (csrfToken: string | undefined): SessionInfo => ({
  id: "session-id",
  createdAt: new Date().toISOString(),
  data: csrfToken === undefined ? {} : { csrfToken },
});

describe("sessionWeb CSRF delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attaches the session token to a guard rejection so anonymous visitors can sign in", async () => {
    const context = createContext(createSession(VALID_CSRF_TOKEN));

    await sessionWeb(context, async () => {
      context.responseData.status = 401;
      context.responseData.payload = {
        status: "error",
        code: "unauthorized",
        message: "Session expired or not found",
      };
    });

    expect(context.responseData.payload).toEqual({
      status: "error",
      code: "unauthorized",
      message: "Session expired or not found",
      csrfToken: VALID_CSRF_TOKEN,
    });
  });

  it("keeps a token the payload already carries", async () => {
    const context = createContext(createSession(VALID_CSRF_TOKEN));

    await sessionWeb(context, async () => {
      context.responseData.payload = {
        status: "error",
        csrfToken: ROTATED_CSRF_TOKEN,
      };
    });

    expect(
      (context.responseData.payload as Record<string, unknown>)["csrfToken"],
    ).toBe(ROTATED_CSRF_TOKEN);
  });

  it("leaves an empty payload alone so route handlers stay in control", async () => {
    const context = createContext(createSession(VALID_CSRF_TOKEN));

    await sessionWeb(context, async () => {
      // A route handler runs after the middleware chain unwinds.
    });

    expect(context.responseData.payload).toBeNull();
  });

  it("does nothing when the session has no valid token", async () => {
    const context = createContext(createSession(undefined));

    await sessionWeb(context, async () => {
      context.responseData.payload = { status: "error" };
    });

    expect(context.responseData.payload).toEqual({ status: "error" });
  });
});
