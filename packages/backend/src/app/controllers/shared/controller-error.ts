import type { HttpContext } from "#vendor/types/types.js";
import { appErrorToHttpPayload, applyAppErrorStatus } from "#app/services/shared/apply-service-status.js";
import {
  type AppError,
} from "#app/services/shared/errors.js";

export function mapControllerError(
  context: Pick<HttpContext<unknown, unknown>, "responseData">,
  error: AppError,
): ReturnType<typeof appErrorToHttpPayload> {
  applyAppErrorStatus(context.responseData, error);
  return appErrorToHttpPayload(error);
}
