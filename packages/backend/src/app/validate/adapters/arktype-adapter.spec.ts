import { type } from "@arktype/type";
import { describe, expect, it } from "vitest";

import { arkValidator } from "./arktype-adapter.js";

describe("arkValidator", () => {
  it("returns ok:true with typed value for valid input", () => {
    const schema = type({
      email: "string.email",
    });

    const result = arkValidator(schema).validate({
      email: "user@example.com",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        email: "user@example.com",
      },
    });
  });

  it("returns ok:false with validation messages for invalid input", () => {
    const schema = type({
      email: "string.email",
    });

    const result = arkValidator(schema).validate({
      email: "not-an-email",
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      ok: false,
      messages: expect.any(Array),
    });
    if (result.ok) {
      throw new Error("Expected validation failure");
    }
    expect(result.messages[0]).toContain("email");
  });

  it("exposes the original schema via describe()", () => {
    const schema = type({
      email: "string.email",
    });

    expect(arkValidator(schema).describe?.()).toBe(schema);
  });
});
