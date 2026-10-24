import { type, type Type } from '@arktype/type'

import type { ValidationIssue, ValidationResult, Validator } from '#vendor/contracts/validator.js'

export function arkValidator<T>(schema: Type<T>): Validator<T> {
    return {
        validate(input: unknown): ValidationResult<T> {
            const result = (schema as unknown as (value: unknown) => unknown)(input)
            if (result instanceof type.errors) {
                const issues: ValidationIssue[] = [...result].map((error) => ({
                    path: error.propString,
                    message: error.message,
                }))
                const messages =
                    issues.length > 0 ? issues.map((issue) => issue.message) : [result.summary]

                return { ok: false, messages, issues }
            }

            return { ok: true, value: result as T }
        },
        describe: () => schema,
    }
}
