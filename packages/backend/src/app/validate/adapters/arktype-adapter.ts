import { type, type Type } from "@arktype/type";

import type {
  ValidationResult,
  Validator,
} from "#vendor/contracts/validator.js";

export function arkValidator<T>(schema: Type<T>): Validator<T> {
  return {
    validate(input: unknown): ValidationResult<T> {
      const result = (schema as unknown as (value: unknown) => unknown)(input);
      if (result instanceof type.errors) {
        const summary =
          typeof result === "object" &&
          result !== null &&
          "summary" in result &&
          typeof result.summary === "string"
            ? result.summary
            : "Validation failure";

        return { ok: false, messages: [summary] };
      }

      return { ok: true, value: result as T };
    },
    describe: () => schema,
  };
}
