import { ValidationError } from "#app/validate/errors/validation-error.js";

export type FlattenedQuery = Record<string, string | string[]>;

/**
 * Converts a `URLSearchParams` instance into a plain object suitable for
 * ArkType validation.
 *
 *  - Keys listed in `arrayKeys` are collected via push into a `string[]`.
 *    A single occurrence yields a one-element array — never a bare string —
 *    so the schema may safely assert `'string[]'`.
 *  - All other keys must appear at most once. A duplicate occurrence raises
 *    `ValidationError` (which the framework surfaces as 422). This is
 *    deliberate: `Object.fromEntries(URLSearchParams)` would silently keep
 *    only the last value, but the prior behavior of `URLSearchParams.get`
 *    returned the first value — so collapsing silently would change
 *    semantics on every existing route.
 */
export function flattenQuery(
    q: URLSearchParams,
    arrayKeys: ReadonlySet<string> = new Set<string>(),
): FlattenedQuery {
    const out: FlattenedQuery = {};
    const seen = new Set<string>();

    for (const [key, value] of q) {
        if (arrayKeys.has(key)) {
            const slot = out[key];
            if (Array.isArray(slot)) {
                slot.push(value);
            } else {
                out[key] = [value];
            }
            continue;
        }

        if (seen.has(key)) {
            throw new ValidationError([`Duplicate query key: ${key}`]);
        }
        seen.add(key);
        out[key] = value;
    }

    return out;
}
