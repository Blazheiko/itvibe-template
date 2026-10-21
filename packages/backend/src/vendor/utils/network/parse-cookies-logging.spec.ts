import { afterEach, describe, expect, it, vi } from "vitest";

const warn = vi.fn();
vi.mock("#vendor/utils/logger.js", () => ({
  default: { warn, info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { parseCookies } = await import("./http-request-handlers.js");

const SECRET = "SYNTHETIC_SESSION_TOKEN";

afterEach(() => {
  vi.restoreAllMocks();
  warn.mockClear();
});

describe("parseCookies decode errors", () => {
  it("skips the broken cookie without logging the cookie header", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const cookies = parseCookies(`session=${SECRET}; other=%FF`);

    expect(cookies.get("session")).toBe(SECRET);
    expect(cookies.has("other")).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).not.toContain(SECRET);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
