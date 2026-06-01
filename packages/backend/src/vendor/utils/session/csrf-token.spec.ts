import { describe, expect, it } from "vitest";

import {
  generateCsrfToken,
  getSessionCsrfToken,
  isValidCsrfToken,
} from "./csrf-token.js";

const VALID_CSRF_TOKEN = "a".repeat(43);

describe("csrf-token helpers", () => {
  it("generates URL-safe 256-bit tokens", () => {
    const token = generateCsrfToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{32,128}$/);
    expect(token).toHaveLength(43);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
  });

  it("validates token alphabet and length", () => {
    expect(isValidCsrfToken(VALID_CSRF_TOKEN)).toBe(true);
    expect(isValidCsrfToken("a".repeat(31))).toBe(false);
    expect(isValidCsrfToken("a".repeat(129))).toBe(false);
    expect(isValidCsrfToken("abc+123")).toBe(false);
    expect(isValidCsrfToken("")).toBe(false);
    expect(isValidCsrfToken(undefined)).toBe(false);
  });

  it("reads only valid session CSRF tokens", () => {
    expect(
      getSessionCsrfToken({
        id: "session-id",
        createdAt: new Date().toISOString(),
        data: { csrfToken: VALID_CSRF_TOKEN },
      }),
    ).toBe(VALID_CSRF_TOKEN);
    expect(
      getSessionCsrfToken({
        id: "session-id",
        createdAt: new Date().toISOString(),
        data: { csrfToken: "abc+123" },
      }),
    ).toBeUndefined();
    expect(getSessionCsrfToken(null)).toBeUndefined();
  });
});
