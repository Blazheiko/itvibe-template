import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#config/session.js", () => ({
  default: {
    cookieName: "__Host-uapi",
    legacyCookieName: "uapi",
  },
}));

vi.mock("#vendor/utils/logger.js", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    debug: vi.fn(),
  },
}));

import sessionConfig from "#config/session.js";
import logger from "#vendor/utils/logger.js";
import { resolveSessionCookie } from "./resolve-session-cookie.js";

describe("resolveSessionCookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (sessionConfig as { cookieName: string }).cookieName = "__Host-uapi";
    (sessionConfig as { legacyCookieName: string }).legacyCookieName = "uapi";
  });

  it("returns source 'active' when only the new cookie is present", () => {
    const cookies = new Map([["__Host-uapi", "new-token"]]);
    const result = resolveSessionCookie(cookies);
    expect(result).toEqual({ token: "new-token", source: "active" });
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("returns source 'legacy' when only the legacy cookie is present", () => {
    const cookies = new Map([["uapi", "legacy-token"]]);
    const result = resolveSessionCookie(cookies);
    expect(result).toEqual({ token: "legacy-token", source: "legacy" });
    expect(logger.info).toHaveBeenCalledWith(
      { cookie: "legacy" },
      "Read session from legacy cookie name",
    );
  });

  it("prefers the active cookie when both are present", () => {
    const cookies = new Map([
      ["__Host-uapi", "new-token"],
      ["uapi", "legacy-token"],
    ]);
    const result = resolveSessionCookie(cookies);
    expect(result).toEqual({ token: "new-token", source: "active" });
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("returns source 'none' when no cookie is present", () => {
    const result = resolveSessionCookie(new Map());
    expect(result).toEqual({ token: undefined, source: "none" });
  });

  it("does not double-read when active and legacy names are equal", () => {
    (sessionConfig as { cookieName: string }).cookieName = "uapi";
    const cookies = new Map([["uapi", "shared-token"]]);
    const result = resolveSessionCookie(cookies);
    expect(result).toEqual({ token: "shared-token", source: "active" });
    expect(logger.info).not.toHaveBeenCalled();
  });
});
