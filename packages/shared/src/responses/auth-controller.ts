import { type } from "@arktype/type";
import type { ErrorCode as AppErrorCode } from "../errors/error-codes.js";
import { CanonicalErrorResponseSchema, type CanonicalErrorResponse } from "./error-response.js";

const AuthUserSchema = type({
  id: "string",
  name: "string",
  email: "string",
  emailVerified: "boolean",
  "emailVerifiedAt?": "string | null",
  "role?": "'user' | 'admin' | 'partner'",
});

export const RegisterResponseSchema = type.or(
  {
    status: "'success'",
    "message?": "string",
    "user?": AuthUserSchema,
  },
  CanonicalErrorResponseSchema,
);
export type RegisterResponse = typeof RegisterResponseSchema.infer;

export const LoginResponseSchema = type.or(
  {
    status: "'success'",
    "message?": "string",
    "user?": AuthUserSchema,
  },
  CanonicalErrorResponseSchema,
);
export type LoginResponse = typeof LoginResponseSchema.infer;

export const LogoutResponseSchema = type.or(
  { status: "'success'", "message?": "string" },
  CanonicalErrorResponseSchema,
);
export type LogoutResponse = typeof LogoutResponseSchema.infer;

export const LogoutAllResponseSchema = type.or(
  {
    status: "'success'",
    "message?": "string",
    "deletedCount?": "number",
  },
  CanonicalErrorResponseSchema,
);
export type LogoutAllResponse = typeof LogoutAllResponseSchema.infer;

export const ChangePasswordResponseSchema = type.or(
  { status: "'success'", "message?": "string" },
  CanonicalErrorResponseSchema,
);
export type ChangePasswordResponse = typeof ChangePasswordResponseSchema.infer;

const ForgotPasswordStatus = type.enumerated("success");
export const ForgotPasswordResponseSchema = type({
  status: ForgotPasswordStatus,
  "message?": "string",
});
export type ForgotPasswordResponse = typeof ForgotPasswordResponseSchema.infer;

const ResetPasswordReason = type.enumerated(
  "invalid_token",
  "expired_token",
  "used_token",
  "token_required",
  "passwords_mismatch",
);
export const ResetPasswordResponseSchema = type.or(
  { status: "'success'", "message?": "string" },
  CanonicalErrorResponseSchema,
  {
    status: "'error'",
    code: CanonicalErrorResponseSchema.get("code"),
    message: "string",
    reason: ResetPasswordReason,
    "details?": "unknown",
  },
);
export type ResetPasswordResponse =
  | { status: "success"; message?: string }
  | CanonicalErrorResponse
  | {
      status: "error";
      code: AppErrorCode;
      message: string;
      reason: typeof ResetPasswordReason.infer;
      details?: unknown;
    };

export const VerifyEmailResponseSchema = type.or(
  { status: "'success'", "message?": "string" },
  CanonicalErrorResponseSchema,
);
export type VerifyEmailResponse = typeof VerifyEmailResponseSchema.infer;

export const ResendVerificationEmailResponseSchema = type.or(
  { status: "'success'", "message?": "string" },
  CanonicalErrorResponseSchema,
);
export type ResendVerificationEmailResponse =
  typeof ResendVerificationEmailResponseSchema.infer;
