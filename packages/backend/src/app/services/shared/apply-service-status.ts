import type { ResponseData } from "#vendor/types/types.js";
import type { AppError } from "./errors.js";
import {
  appErrorCode,
  appErrorMessage,
  appErrorReason,
  appErrorRetryAfterSeconds,
  appErrorStatus,
} from "./errors.js";

export function applyAppErrorStatus(
  responseData: ResponseData,
  error: AppError,
): void {
  responseData.status = appErrorStatus(error);

  const retryAfterSeconds = appErrorRetryAfterSeconds(error);
  if (retryAfterSeconds !== undefined) {
    responseData.setHeader("Retry-After", String(retryAfterSeconds));
  }
}

export type AppErrorHttpPayload = {
  status: "error";
  message: string;
  code: ReturnType<typeof appErrorCode>;
  reason?: string;
};

export function appErrorToHttpPayload(error: AppError): AppErrorHttpPayload {
  const reason = appErrorReason(error);

  return {
    status: "error",
    message: appErrorMessage(error),
    code: appErrorCode(error),
    ...(reason !== undefined ? { reason } : {}),
  };
}

export function applyAppError(
  responseData: ResponseData,
  error: AppError,
): void {
  applyAppErrorStatus(responseData, error);
  responseData.payload = appErrorToHttpPayload(error);
}
