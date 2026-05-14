import { describe, expect, it, vi } from "vitest";

import {
  getHttpStatusLine,
  setCookies,
  writeHttpStatus,
} from "./http-response-handlers.js";

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

  it("does not emit cookie security flags when they are false", () => {
    const writeHeader = vi.fn();

    setCookies(
      { writeHeader } as any,
      new Map([
        [
          "session",
          {
            name: "session",
            value: "token",
            path: "/",
            httpOnly: false,
            secure: false,
            expires: undefined,
            maxAge: undefined,
            sameSite: "Lax",
          },
        ],
      ]),
    );

    expect(writeHeader).toHaveBeenCalledWith(
      "Set-Cookie",
      "session=token; Path=/; SameSite=Lax",
    );
  });
});
