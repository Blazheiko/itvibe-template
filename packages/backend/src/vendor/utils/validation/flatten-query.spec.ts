import { describe, expect, it } from "vitest";
import { flattenQuery } from "./flatten-query.js";
import { ValidationError } from "#app/validate/errors/validation-error.js";

describe("flattenQuery", () => {
  it("returns {} for empty params", () => {
    expect(flattenQuery(new URLSearchParams())).toEqual({});
  });

  it("collects single-occurrence keys as strings", () => {
    const q = new URLSearchParams("a=1&b=hello");
    expect(flattenQuery(q)).toEqual({ a: "1", b: "hello" });
  });

  it("preserves empty-string values", () => {
    const q = new URLSearchParams("a=");
    expect(flattenQuery(q)).toEqual({ a: "" });
  });

  it("rejects duplicates by default with a clear ValidationError", () => {
    const q = new URLSearchParams("a=1&a=2");
    expect(() => flattenQuery(q)).toThrow(ValidationError);
    try {
      flattenQuery(q);
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).messages).toEqual([
        "Duplicate query key: a",
      ]);
    }
  });

  it("collects array keys into string[] in encounter order", () => {
    const q = new URLSearchParams("tag=a&tag=b&tag=c");
    expect(flattenQuery(q, new Set(["tag"]))).toEqual({
      tag: ["a", "b", "c"],
    });
  });

  it("a single occurrence of an array key yields a one-element array", () => {
    const q = new URLSearchParams("tag=a");
    expect(flattenQuery(q, new Set(["tag"]))).toEqual({ tag: ["a"] });
  });

  it("array keys and scalar keys coexist", () => {
    const q = new URLSearchParams("tag=a&tag=b&page=1");
    expect(flattenQuery(q, new Set(["tag"]))).toEqual({
      tag: ["a", "b"],
      page: "1",
    });
  });

  it("a key not in arrayKeys still rejects duplicates even if another key is allowed as array", () => {
    const q = new URLSearchParams("tag=a&tag=b&page=1&page=2");
    expect(() => flattenQuery(q, new Set(["tag"]))).toThrow(ValidationError);
  });
});
