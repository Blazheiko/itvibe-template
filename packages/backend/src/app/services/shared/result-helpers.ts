import { Result } from "better-result";
import type { AppError, AppResult } from "./errors.js";
import { internal } from "./errors.js";

export function toInternalError(
  cause: unknown,
  publicMessage = "Internal error",
): AppError {
  return internal(cause, publicMessage);
}

export function tryInternal<T>(
  fn: () => Promise<T>,
  publicMessage: string,
): Promise<AppResult<T>> {
  return Result.tryPromise({
    try: fn,
    catch: (cause) => toInternalError(cause, publicMessage),
  });
}

export function tryDomain<T, E extends AppError>(
  fn: () => Promise<T>,
  mapError: (cause: unknown) => E,
): Promise<Result<T, E>> {
  return Result.tryPromise({
    try: fn,
    catch: mapError,
  });
}
