import type { ErrorCode } from "shared/errors";
import type { Result as ResultType } from "better-result";

export type AppError =
  | { _tag: "BadRequest"; message: string; reason?: string }
  | { _tag: "Unauthorized"; message: string }
  | { _tag: "Forbidden"; message: string; reason?: string }
  | { _tag: "NotFound"; resource: string; message: string }
  | { _tag: "Conflict"; message: string; reason?: string }
  | { _tag: "Internal"; publicMessage: string; cause?: unknown };

export type AppErrorCode = Extract<
  ErrorCode,
  "bad_request" | "unauthorized" | "forbidden" | "not_found" | "conflict" | "internal_error"
>;

export type AppResult<T> = ResultType<T, AppError>;

const APP_ERROR_CODE_MAP: Record<AppError["_tag"], AppErrorCode> = {
  BadRequest: "bad_request",
  Unauthorized: "unauthorized",
  Forbidden: "forbidden",
  NotFound: "not_found",
  Conflict: "conflict",
  Internal: "internal_error",
};

const APP_ERROR_STATUS_MAP: Record<AppError["_tag"], number> = {
  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  Conflict: 409,
  Internal: 500,
};

export function badRequest(message: string, reason?: string): AppError {
  return {
    _tag: "BadRequest",
    message,
    ...(reason !== undefined ? { reason } : {}),
  };
}

export function unauthorized(message = "Unauthorized"): AppError {
  return { _tag: "Unauthorized", message };
}

export function forbidden(message: string, reason?: string): AppError {
  return {
    _tag: "Forbidden",
    message,
    ...(reason !== undefined ? { reason } : {}),
  };
}

export function notFound(resource: string, message: string): AppError {
  return { _tag: "NotFound", resource, message };
}

export function conflict(message: string, reason?: string): AppError {
  return {
    _tag: "Conflict",
    message,
    ...(reason !== undefined ? { reason } : {}),
  };
}

export function internal(
  cause: unknown,
  publicMessage = "Internal error",
): AppError {
  return {
    _tag: "Internal",
    publicMessage,
    ...(cause !== undefined ? { cause } : {}),
  };
}

export function internalMessage(publicMessage = "Internal error"): AppError {
  return internal(undefined, publicMessage);
}

export function appErrorMessage(error: AppError): string {
  return error._tag === "Internal" ? error.publicMessage : error.message;
}

export function appErrorReason(error: AppError): string | undefined {
  return "reason" in error ? error.reason : undefined;
}

export function appErrorCode(error: AppError): AppErrorCode {
  return APP_ERROR_CODE_MAP[error._tag];
}

export function appErrorStatus(error: AppError): number {
  return APP_ERROR_STATUS_MAP[error._tag];
}
