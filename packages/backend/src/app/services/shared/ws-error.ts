import type { AppError, AppErrorCode } from "./errors.js";
import { appErrorCode, appErrorMessage, appErrorReason } from "./errors.js";

export interface AppWsError extends Record<string, unknown> {
  status: "error";
  message: string;
  code: AppErrorCode;
  reason?: string;
}

export function appErrorToWsError(error: AppError): AppWsError {
  const reason = appErrorReason(error);

  return {
    status: "error",
    message: appErrorMessage(error),
    code: appErrorCode(error),
    ...(reason !== undefined ? { reason } : {}),
  };
}
