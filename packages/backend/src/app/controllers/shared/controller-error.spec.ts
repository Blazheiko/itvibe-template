import { describe, expect, it } from "vitest";
import { badRequest } from "#app/services/shared/errors.js";
import { mapControllerError } from "./controller-error.js";

describe("mapControllerError", () => {
  it("applies status and returns error payload", () => {
    const responseData = { status: 200 } as any;

    const result = mapControllerError({ responseData }, badRequest("X"));

    expect(responseData.status).toBe(400);
    expect(result).toEqual({ status: "error", code: "bad_request", message: "X" });
  });
});
