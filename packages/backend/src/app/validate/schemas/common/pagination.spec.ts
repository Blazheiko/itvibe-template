import { describe, expect, it } from "vitest";
import { type } from "@arktype/type";
import { arkValidator } from "#app/validate/index.js";
import {
    CursorQuerySchema,
    DateRangeQuerySchema,
    PaginationQuerySchema,
    DateFromString,
    LimitIntFromString,
    PositiveIntFromString,
} from "./pagination.js";

// ArkType `type({...})` returns a `Type` instance whose `t` generic is the
// raw definition (not the parsed shape), so TypeScript reports "no call
// signatures" in `--strict`. The runtime call works fine. We route through
// `arkValidator(...).validate(...)` (the same wrapper the framework uses)
// to keep the tests type-clean and exercise the real validation path.
const validate = (schema: ReturnType<typeof type>, input: unknown): unknown =>
    (arkValidator(schema as never).validate(input) as { ok: true; value: unknown })
        .value;

const isErrors = (schema: ReturnType<typeof type>, input: unknown): boolean => {
    const r = arkValidator(schema as never).validate(input);
    return !r.ok;
};

describe("PaginationQuerySchema", () => {
    it("applies defaults when fields are missing", () => {
        expect(validate(PaginationQuerySchema, {})).toEqual({ page: 1, limit: 50 });
    });

    it("parses provided strings into integers", () => {
        expect(validate(PaginationQuerySchema, { page: "3", limit: "20" })).toEqual({
            page: 3,
            limit: 20,
        });
    });

    it("rejects page <= 0", () => {
        expect(isErrors(PaginationQuerySchema, { page: "0", limit: "20" })).toBe(true);
    });

    it("rejects limit > 200", () => {
        expect(isErrors(PaginationQuerySchema, { page: "1", limit: "300" })).toBe(true);
    });

    it("rejects non-numeric input", () => {
        expect(isErrors(PaginationQuerySchema, { page: "abc" })).toBe(true);
    });
});

describe("DateRangeQuerySchema", () => {
    it("accepts empty input (both fields optional)", () => {
        expect(validate(DateRangeQuerySchema, {})).toEqual({});
    });

    it("parses ISO date string into Date", () => {
        const r = validate(DateRangeQuerySchema, {
            dateFrom: "2026-01-01",
        }) as { dateFrom: Date };
        expect(r.dateFrom).toBeInstanceOf(Date);
    });

    it("rejects garbage date", () => {
        expect(isErrors(DateRangeQuerySchema, { dateFrom: "not-a-date" })).toBe(true);
    });
});

describe("CursorQuerySchema", () => {
    it("applies default limit and accepts no cursor", () => {
        expect(validate(CursorQuerySchema, {})).toEqual({ limit: 50 });
    });

    it("accepts cursor + custom limit", () => {
        expect(validate(CursorQuerySchema, { cursor: "abc", limit: "100" })).toEqual({
            cursor: "abc",
            limit: 100,
        });
    });
});

describe("schema-first composition", () => {
    it("composes atomics into one schema without shared shape spreads", () => {
        const Combined = type({
            page: [PositiveIntFromString, "=", "1"] as unknown as never,
            limit: [LimitIntFromString, "=", "50"] as unknown as never,
            "dateFrom?": DateFromString,
            "userId?": "string",
        });
        const result = validate(Combined, {
            page: "2",
            limit: "10",
            dateFrom: "2026-01-01",
            userId: "u1",
        }) as {
            page: number;
            limit: number;
            userId: string;
            dateFrom: Date;
        };
        expect(result.page).toBe(2);
        expect(result.limit).toBe(10);
        expect(result.userId).toBe("u1");
        expect(result.dateFrom).toBeInstanceOf(Date);
    });
});
