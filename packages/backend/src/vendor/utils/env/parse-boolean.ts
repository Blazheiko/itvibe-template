/**
 * Parse a string env value into a boolean.
 *
 * Truthy values: 'true', '1', 'yes', 'on' (case-sensitive).
 * Falsy values: anything else.
 * Returns `defaultValue` when the env var is undefined.
 */
export function parseBoolean(
  value: string | undefined,
  defaultValue = false,
): boolean {
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1" || value === "yes" || value === "on";
}
