// One problem of a field; `path` is dot-separated (`nested.name`), `''` for the root.
export interface ValidationIssue {
    path: string
    message: string
}

export type ValidationResult<T> =
    { ok: true; value: T } | { ok: false; messages: string[]; issues?: ValidationIssue[] }

export interface Validator<T> {
    validate(input: unknown): ValidationResult<T>
    describe?(): unknown
}

export type InferPayload<V> = V extends Validator<infer T> ? T : unknown
