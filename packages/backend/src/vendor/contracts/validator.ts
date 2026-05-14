export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; messages: string[] };

export interface Validator<T> {
  validate(input: unknown): ValidationResult<T>;
  describe?(): unknown;
}

export type InferPayload<V> = V extends Validator<infer T> ? T : unknown;
