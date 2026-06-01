import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#config/session.js", () => ({
  default: {
    cookieName: "__Host-uapi",
    legacyCookieName: "uapi",
    cookie: {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  },
}));

vi.mock("#config/cookies.js", () => ({
  default: {
    default: {
      path: "/",
      httpOnly: true,
      secure: true,
      maxAge: 3600,
      sameSite: "Lax",
    },
  },
}));

import sessionConfig from "#config/session.js";
import { setCookies } from "#vendor/utils/network/http-response-handlers.js";
import { createResponseData } from "#vendor/utils/network/response-data.js";
import { deleteLegacySessionCookie } from "./delete-legacy-session-cookie.js";
import type { HttpResponse } from "#vendor/start/server.js";

const serialize = (rd: ReturnType<typeof createResponseData>): string[] => {
  const written: string[] = [];
  const res = {
    writeHeader: vi.fn((name: string, value: string) => {
      if (name === "Set-Cookie") written.push(value);
    }),
  } as unknown as HttpResponse;
  setCookies(res, rd.cookies);
  return written;
};

describe("deleteLegacySessionCookie", () => {
  beforeEach(() => {
    (sessionConfig as { cookieName: string }).cookieName = "__Host-uapi";
    (sessionConfig as { legacyCookieName: string }).legacyCookieName = "uapi";
  });

  afterEach(() => {
    (sessionConfig as { cookieName: string }).cookieName = "__Host-uapi";
    (sessionConfig as { legacyCookieName: string }).legacyCookieName = "uapi";
  });

  it("emits a tombstone Set-Cookie for the legacy name when migration is active", () => {
    const rd = createResponseData();
    deleteLegacySessionCookie(rd);
    const headers = serialize(rd);

    expect(headers).toHaveLength(1);
    const header = headers[0]!;
    expect(header).toMatch(/^uapi=;/);
    expect(header).toContain("; Path=/");
    expect(header).toContain("; Max-Age=0");
    expect(header).toContain("; Secure");
    expect(header).toContain("; SameSite=Lax");
    expect(header).not.toContain("Domain=");
  });

  it("is a no-op when active and legacy names are equal (migration off)", () => {
    (sessionConfig as { cookieName: string }).cookieName = "uapi";
    const rd = createResponseData();
    deleteLegacySessionCookie(rd);

    expect(serialize(rd)).toHaveLength(0);
  });

  it("matches the cookie attributes used by session-handler writes", () => {
    const rd = createResponseData();
    deleteLegacySessionCookie(rd);
    const header = serialize(rd)[0]!;

    // session-handler writes Path=/, Secure=true (outside local), SameSite=Lax.
    // Deletion must match those for the browser to overwrite.
    expect(header).toContain(`; Path=${sessionConfig.cookie.path}`);
    expect(header).toContain(`; SameSite=${sessionConfig.cookie.sameSite}`);
    if (sessionConfig.cookie.secure) {
      expect(header).toContain("; Secure");
    } else {
      expect(header).not.toContain("; Secure");
    }
  });
});
