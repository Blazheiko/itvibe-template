import { describe, expect, it, vi } from "vitest";

import {
  getHttpStatusLine,
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
});
