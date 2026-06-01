import { type } from "@arktype/type";
import { ErrorCodeSchema } from "../errors/error-codes.js";
import type { ErrorCode, ErrorDetails } from "../errors/error-codes.js";

export const BaseResponseSchema = type({
  status: "string",
});
export type BaseResponse = typeof BaseResponseSchema.infer;

export const CanonicalErrorResponseSchema = type({
  status: "'error'",
  code: ErrorCodeSchema,
  message: "string",
  "reason?": "string",
  "details?": "unknown",
});

export interface CanonicalErrorResponse extends Record<string, unknown> {
  status: "error";
  code: ErrorCode;
  message: string;
  reason?: string;
  details?: ErrorDetails;
}

export const ErrorResponseSchema = CanonicalErrorResponseSchema;
export type ErrorResponse = typeof ErrorResponseSchema.infer;
export type AppErrorResponse = CanonicalErrorResponse;

export const SuccessResponseSchema = type({
  status: "'ok'",
  "data?": "unknown",
});
export type SuccessResponse = typeof SuccessResponseSchema.infer;
