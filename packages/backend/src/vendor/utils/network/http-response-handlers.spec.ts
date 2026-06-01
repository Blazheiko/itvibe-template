import { describe, expect, it, vi } from "vitest";

import {
  getHttpStatusLine,
  setCookies,
  writeHttpStatus,
} from "./http-response-handlers.js";
import type { Cookie } from "#vendor/types/types.js";
import type { HttpResponse } from "#vendor/start/server.js";

const collectCookieHeaders = (cookies: Map<string, Cookie>): string[] => {
  const written: string[] = [];
  const res = {
    writeHeader: vi.fn((name: string, value: string) => {
      if (name === "Set-Cookie") written.push(value);
    }),
  } as unknown as HttpResponse;
  setCookies(res, cookies);
  return written;
};

const makeCookie = (
  overrides: Partial<Cookie> & Pick<Cookie, "name" | "value">,
): Cookie => ({
  path: undefined,
  httpOnly: undefined,
  secure: undefined,
  expires: undefined,
  maxAge: undefined,
  sameSite: undefined,
  ...overrides,
});

const cookieMap = (
  overrides: Partial<Cookie> & Pick<Cookie, "name" | "value">,
): Map<string, Cookie> => {
  const cookie = makeCookie(overrides);
  return new Map([[cookie.name, cookie]]);
};

describe("http-response-handlers", () => {
  it("builds full status lines for known HTTP codes", () => {
    expect(getHttpStatusLine(422)).toBe("422 Unprocessable Entity");
    expect(getHttpStatusLine("404")).toBe("404 Not Found");
  });

  it("writes full status lines to uWebSockets responses", () => {
    const writeStatus = vi.fn();

    writeHttpStatus({ writeStatus }, 422);

    expect(writeStatus).toHaveBeenCalledWith("422 Unprocessable Entity");
  });

  describe("setCookies", () => {
    it("emits Secure only when secure === true", () => {
      expect(
        collectCookieHeaders(
          cookieMap({ name: "a", value: "1", secure: true }),
        )[0],
      ).toContain("; Secure");
    });

    it("does not emit Secure when secure === false", () => {
      expect(
        collectCookieHeaders(
          cookieMap({ name: "a", value: "1", secure: false }),
        )[0],
      ).not.toContain("; Secure");
    });

    it("does not emit Secure when secure is omitted", () => {
      expect(
        collectCookieHeaders(cookieMap({ name: "a", value: "1" }))[0],
      ).not.toContain("; Secure");
    });

    it("emits HttpOnly only when httpOnly === true", () => {
      expect(
        collectCookieHeaders(
          cookieMap({ name: "a", value: "1", httpOnly: true }),
        )[0],
      ).toContain("; HttpOnly");
    });

    it("does not emit HttpOnly when httpOnly === false", () => {
      expect(
        collectCookieHeaders(
          cookieMap({ name: "a", value: "1", httpOnly: false }),
        )[0],
      ).not.toContain("; HttpOnly");
    });

    it("does not emit HttpOnly when httpOnly is omitted", () => {
      expect(
        collectCookieHeaders(cookieMap({ name: "a", value: "1" }))[0],
      ).not.toContain("; HttpOnly");
    });

    it("never emits Domain= regardless of input", () => {
      const header = collectCookieHeaders(
        cookieMap({
          name: "a",
          value: "1",
          secure: true,
          httpOnly: true,
          path: "/",
          maxAge: 60,
          sameSite: "Lax",
        }),
      )[0];
      expect(header).not.toContain("Domain=");
    });

    it("emits both Max-Age and Expires when both are provided, and the values agree", () => {
      const ageSeconds = 3600;
      const now = Date.now();
      const expires = new Date(now + ageSeconds * 1000);
      const header = collectCookieHeaders(
        cookieMap({
          name: "a",
          value: "1",
          maxAge: ageSeconds,
          expires,
        }),
      )[0]!;

      expect(header).toContain(`; Max-Age=${String(ageSeconds)}`);
      expect(header).toContain(`; Expires=${expires.toUTCString()}`);
    });
  });
});
