import { type } from "@arktype/type";

export const ErrorCode = {
  BadRequest: "bad_request",
  Unauthorized: "unauthorized",
  Forbidden: "forbidden",
  NotFound: "not_found",
  Conflict: "conflict",
  ValidationFailed: "validation_failed",
  PayloadTooLarge: "payload_too_large",
  UnsupportedMediaType: "unsupported_media_type",
  RateLimited: "rate_limited",
  InternalError: "internal_error",
} as const;

export const ErrorCodeValues = [
  "bad_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "validation_failed",
  "payload_too_large",
  "unsupported_media_type",
  "rate_limited",
  "internal_error",
] as const;

export const ErrorCodeSchema = type.enumerated(...ErrorCodeValues);
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ValidationErrorDetails {
  kind: "validation";
  messages: string[];
  fields?: string[];
}

export interface ParameterValidationErrorDetails {
  kind: "parameter_validation";
  parameter: string;
  messages?: string[];
}

export interface PayloadTooLargeErrorDetails {
  kind: "payload_too_large";
  limit: number;
  contentType?: string;
}

export interface UnsupportedMediaTypeErrorDetails {
  kind: "unsupported_media_type";
  receivedContentType?: string;
  allowedKinds: string[];
}

export interface RateLimitedErrorDetails {
  kind: "rate_limited";
  retryAfterMs?: number;
}

export type ErrorDetails =
  | ValidationErrorDetails
  | ParameterValidationErrorDetails
  | PayloadTooLargeErrorDetails
  | UnsupportedMediaTypeErrorDetails
  | RateLimitedErrorDetails;
