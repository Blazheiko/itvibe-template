import { describe, expect, it, vi } from "vitest";

import staticPageController from "./static-page-controller.js";

const loggerErrorMock = vi.hoisted(() => vi.fn());
const VALID_CSRF_TOKEN = "a".repeat(43);

vi.mock("#vendor/utils/logger.js", () => ({
  default: {
    error: loggerErrorMock,
  },
}));

const createContext = (payload: string) =>
  ({
    httpData: {
      method: "get",
      ip: null,
      path: "/",
      referer: undefined,
      query: new URLSearchParams(),
      headers: new Map(),
      cookies: new Map(),
      files: null,
      hasFile: vi.fn(() => false),
    },
    responseData: {
      aborted: false,
      payload,
      middlewareData: {},
      headers: [],
      cookies: new Map(),
      status: 200,
      deleteCookie: vi.fn(),
      setCookie: vi.fn(),
      setHeader: vi.fn(),
    },
    sessionInfo: {
      id: "session-id",
      createdAt: new Date().toISOString(),
      data: {
        csrfToken: VALID_CSRF_TOKEN,
      },
    },
  }) as unknown as Parameters<typeof staticPageController>[0];

describe("staticPageController", () => {
  it("replaces the CSRF placeholder in static HTML", async () => {
    const context = createContext(
      '<html><head><meta name="csrf-token" content="__CSRF_TOKEN__"></head></html>',
    );

    await staticPageController(context);

    expect(context.responseData.payload).toContain(VALID_CSRF_TOKEN);
    expect(context.responseData.payload).not.toContain("__CSRF_TOKEN__");
    expect(context.responseData.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "private, no-store",
    );
  });

  it("logs and leaves HTML unchanged when the placeholder is missing", async () => {
    const html = "<html><head></head></html>";
    const context = createContext(html);

    await staticPageController(context);

    expect(context.responseData.payload).toBe(html);
    expect(loggerErrorMock).toHaveBeenCalledWith(
      { placeholder: "__CSRF_TOKEN__" },
      "CSRF placeholder is missing from static HTML template",
    );
  });
});
