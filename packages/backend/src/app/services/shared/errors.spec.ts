import { describe, expect, it } from "vitest";
import {
  appErrorMessage,
  appErrorReason,
  badRequest,
  conflict,
  forbidden,
  internal,
  internalMessage,
  notFound,
  unauthorized,
} from "./errors.js";

describe("shared errors", () => {
  it("builds domain errors", () => {
    expect(badRequest("Bad input", "bad_input")).toEqual({
      _tag: "BadRequest",
      message: "Bad input",
      reason: "bad_input",
    });
    expect(unauthorized()).toEqual({
      _tag: "Unauthorized",
      message: "Unauthorized",
    });
    expect(forbidden("Denied", "not_allowed")).toEqual({
      _tag: "Forbidden",
      message: "Denied",
      reason: "not_allowed",
    });
    expect(notFound("User", "User not found")).toEqual({
      _tag: "NotFound",
      resource: "User",
      message: "User not found",
    });
    expect(conflict("Conflict", "duplicate")).toEqual({
      _tag: "Conflict",
      message: "Conflict",
      reason: "duplicate",
    });
    expect(internal(new Error("boom"), "Hidden")).toEqual({
      _tag: "Internal",
      publicMessage: "Hidden",
      cause: new Error("boom"),
    });
    expect(internalMessage("Hidden")).toEqual({
      _tag: "Internal",
      publicMessage: "Hidden",
    });
  });

  it("extracts public message and reason", () => {
    expect(appErrorMessage(badRequest("Bad input", "bad_input"))).toBe(
      "Bad input",
    );
    expect(appErrorMessage(internal(new Error("boom"), "Hidden"))).toBe(
      "Hidden",
    );
    expect(appErrorReason(conflict("Conflict", "duplicate"))).toBe("duplicate");
    expect(appErrorReason(notFound("User", "Missing"))).toBeUndefined();
  });
});
