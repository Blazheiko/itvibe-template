import { type } from "@arktype/type";
import { describe, expect, expectTypeOf, it } from "vitest";
import { arkValidator } from "#app/validate/index.js";
import {
  AdminKnowledgeBaseListQuerySchema as SharedAdminKnowledgeBaseListQuerySchema,
  LlmTextUsageQuerySchema as SharedLlmTextUsageQuerySchema,
  PaginationQuerySchema as SharedPaginationQuerySchema,
} from "shared/schemas";
import type {
  AdminKnowledgeBaseListQuery as SharedAdminKnowledgeBaseListQuery,
  AdminKnowledgeBaseListQueryInput as SharedAdminKnowledgeBaseListQueryInput,
  LlmTextUsageQuery as SharedLlmTextUsageQuery,
  LlmTextUsageQueryInput as SharedLlmTextUsageQueryInput,
  PaginationQuery as SharedPaginationQuery,
  PaginationQueryInput as SharedPaginationQueryInput,
} from "shared/schemas";

const PositiveIntFromString = type("string.integer.parse").pipe(
  type("number > 0"),
);

const LimitIntFromString = type("string.integer.parse").pipe(
  type("0 < number <= 200"),
);

const PaginationQuerySchema = type({
  page: [PositiveIntFromString, "=", "1"] as unknown as never,
  limit: [LimitIntFromString, "=", "50"] as unknown as never,
});

const AdminKnowledgeBaseListQuerySchema = PaginationQuerySchema.and(
  type({
    "category?": "string",
  }),
);

const LlmTextUsageQuerySchema = PaginationQuerySchema.and(
  type({
    "dateFrom?": "string.date.parse",
    "dateTo?": "string.date.parse",
    "userId?": "string",
    "feature?": "'TRANSLATOR_TRANSLATE' | 'TRANSLATOR_SUMMARY'",
  }),
);

type PaginationQuery = typeof PaginationQuerySchema.infer;
type PaginationQueryInput = typeof PaginationQuerySchema.inferIn;

type AdminKnowledgeBaseListQuery =
  typeof AdminKnowledgeBaseListQuerySchema.infer;
type AdminKnowledgeBaseListQueryInput =
  typeof AdminKnowledgeBaseListQuerySchema.inferIn;

type LlmTextUsageQuery = typeof LlmTextUsageQuerySchema.infer;
type LlmTextUsageQueryInput = typeof LlmTextUsageQuerySchema.inferIn;

const validate = <T>(schema: ReturnType<typeof type>, input: unknown): T =>
  (arkValidator(schema as never).validate(input) as { ok: true; value: T }).value;

describe("ArkType inference spike", () => {
  it("infers parsed output and input shape for default tuples", () => {
    expectTypeOf<PaginationQuery>().toEqualTypeOf<{
      page: number;
      limit: number;
    }>();

    // ArkType 2.2.0 does not infer the ergonomic HTTP input shape here:
    // `inferIn` reflects the raw object definition for tuple-default fields.
    // This is the key Stage-1 finding the migration plan must account for.
    // @ts-expect-error inferIn is not currently `{ page?: string; limit?: string }`
    const emptyInput: PaginationQueryInput = {};
    // @ts-expect-error inferIn is not currently `{ page?: string; limit?: string }`
    const filledInput: PaginationQueryInput = { page: "2", limit: "10" };

    expect(emptyInput).toEqual({});
    expect(filledInput).toEqual({ page: "2", limit: "10" });
  });

  it("applies tuple defaults and parses numeric strings at runtime", () => {
    expect(validate<PaginationQuery>(PaginationQuerySchema, {})).toEqual({
      page: 1,
      limit: 50,
    });
    expect(
      validate<PaginationQuery>(PaginationQuerySchema, {
        page: "2",
        limit: "10",
      }),
    ).toEqual({
      page: 2,
      limit: 10,
    });
  });

  it("preserves infer and inferIn through .and() composition", () => {
    // @ts-expect-error `.and()` does not currently infer the ergonomic output object
    const output: AdminKnowledgeBaseListQuery = { page: 3, limit: 25, category: "news" };
    // @ts-expect-error `.and()` does not currently infer the ergonomic input object
    const input: AdminKnowledgeBaseListQueryInput = { category: "news", page: "3", limit: "25" };

    expect(validate<AdminKnowledgeBaseListQuery>(AdminKnowledgeBaseListQuerySchema, input)).toEqual({
      category: "news",
      page: 3,
      limit: 25,
    });
    expect(output).toEqual({ page: 3, limit: 25, category: "news" });
  });

  it("keeps literal unions for feature and parses dates", () => {
    // @ts-expect-error `.and()` currently prevents ergonomic property-level inference
    type _Feature = LlmTextUsageQuery["feature"];
    // @ts-expect-error inferIn is not currently the ergonomic query-input shape
    const input: LlmTextUsageQueryInput = { page: "4", limit: "20", dateFrom: "2026-01-01", feature: "TRANSLATOR_TRANSLATE" };

    const parsed = validate<{
      page: number;
      limit: number;
      dateFrom?: Date;
      dateTo?: Date;
      userId?: string;
      feature?: "TRANSLATOR_TRANSLATE" | "TRANSLATOR_SUMMARY";
    }>(LlmTextUsageQuerySchema, input);

    expect(parsed.page).toBe(4);
    expect(parsed.limit).toBe(20);
    expect(parsed.dateFrom).toBeInstanceOf(Date);
    expect(parsed.feature).toBe("TRANSLATOR_TRANSLATE");
  });

  it("returns the same schema type from onUndeclaredKey", () => {
    const strictSchema = PaginationQuerySchema.onUndeclaredKey("reject");
    const looseSchema = PaginationQuerySchema.onUndeclaredKey("delete");

    expectTypeOf(strictSchema).toEqualTypeOf<typeof PaginationQuerySchema>();
    expectTypeOf(looseSchema).toEqualTypeOf<typeof PaginationQuerySchema>();

    expect(validate(strictSchema, { page: "1", limit: "10" })).toEqual({
      page: 1,
      limit: 10,
    });
  });
});

type SharedPaginationSchemaInput = typeof SharedPaginationQuerySchema.inferIn;
type SharedAdminKnowledgeBaseListSchemaInput =
  typeof SharedAdminKnowledgeBaseListQuerySchema.inferIn;
type SharedLlmTextUsageSchemaInput = typeof SharedLlmTextUsageQuerySchema.inferIn;

describe("Shared query schema regression spike", () => {
  it("keeps exported shared aliases ergonomic", () => {
    expectTypeOf<SharedPaginationQuery>().toEqualTypeOf<{
      page: number;
      limit: number;
    }>();
    expectTypeOf<SharedPaginationQueryInput>().toEqualTypeOf<{
      page?: string | number;
      limit?: string | number;
    }>();

    expectTypeOf<SharedAdminKnowledgeBaseListQuery>().toEqualTypeOf<{
      category?: string;
      page: number;
      limit: number;
    }>();
    expectTypeOf<SharedAdminKnowledgeBaseListQueryInput>().toEqualTypeOf<{
      category?: string;
      page?: string | number;
      limit?: string | number;
    }>();

    expectTypeOf<SharedLlmTextUsageQuery>().toMatchTypeOf<{
      page: number;
      limit: number;
      dateFrom?: Date;
      dateTo?: Date;
      userId?: string;
      feature?: string;
    }>();
    expectTypeOf<SharedLlmTextUsageQueryInput>().toMatchTypeOf<{
      page?: string | number;
      limit?: string | number;
      dateFrom?: string;
      dateTo?: string;
      userId?: string;
      feature?: string;
    }>();
  });

  it("shows that raw inferIn is still not a usable shared input contract", () => {
    // @ts-expect-error shared schema `inferIn` is still not ergonomic here
    const paginationInput: SharedPaginationSchemaInput = {};
    const adminInput = {
      // @ts-expect-error shared schema `inferIn` currently expects output-like numbers here
      page: "3",
      // @ts-expect-error shared schema `inferIn` currently expects output-like numbers here
      limit: "25",
      category: "news",
    } satisfies SharedAdminKnowledgeBaseListSchemaInput;
    const usageInput = {
      // @ts-expect-error shared schema `inferIn` currently expects output-like numbers here
      page: "4",
      // @ts-expect-error shared schema `inferIn` currently expects output-like numbers here
      limit: "20",
      // @ts-expect-error shared schema `inferIn` currently expects output-like dates here
      dateFrom: "2026-01-01",
      feature: "TRANSLATOR_TRANSLATE",
    } satisfies SharedLlmTextUsageSchemaInput;

    expect(paginationInput).toEqual({});
    expect(adminInput).toEqual({
      page: "3",
      limit: "25",
      category: "news",
    });
    expect(usageInput).toEqual({
      page: "4",
      limit: "20",
      dateFrom: "2026-01-01",
      feature: "TRANSLATOR_TRANSLATE",
    });
  });

  it("keeps runtime behavior correct for shared schemas despite the typing gap", () => {
    expect(validate<SharedPaginationQuery>(SharedPaginationQuerySchema, {})).toEqual({
      page: 1,
      limit: 50,
    });
    expect(
      validate<SharedAdminKnowledgeBaseListQuery>(
        SharedAdminKnowledgeBaseListQuerySchema,
        {
          page: "3",
          limit: "25",
          category: "news",
        },
      ),
    ).toEqual({
      page: 3,
      limit: 25,
      category: "news",
    });
    expect(
      validate<SharedLlmTextUsageQuery>(SharedLlmTextUsageQuerySchema, {
        page: "4",
        limit: "20",
        dateFrom: "2026-01-01",
        feature: "TRANSLATOR_TRANSLATE",
      }),
    ).toMatchObject({
      page: 4,
      limit: 20,
      feature: "TRANSLATOR_TRANSLATE",
    });
  });
});
