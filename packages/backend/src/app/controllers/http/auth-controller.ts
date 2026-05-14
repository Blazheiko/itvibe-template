import type { HttpContext } from "#vendor/types/types.js";
import { getTypedPayload } from "#vendor/utils/validation/get-typed-payload.js";
import { mapControllerError } from "#app/controllers/shared/controller-error.js";
import { authService } from "#app/services/auth-service.js";
import { Result } from "better-result";
import type {
  ChangePasswordResponse,
  CurrentUserResponse,
  ForgotPasswordResponse,
  RegisterResponse,
  LoginResponse,
  LogoutResponse,
  LogoutAllResponse,
  ResetPasswordResponse,
  VerifyEmailResponse,
  ResendVerificationEmailResponse,
} from "shared";
import type {
  ChangePasswordInput,
  EmptyFormInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "shared/schemas";
import { emailVerificationService } from "#app/services/email-verification-service.js";
import {
  GENERIC_RESET_MESSAGE,
  passwordResetService,
} from "#app/services/password-reset-service.js";
import {
  appErrorReason,
  unauthorized,
} from "#app/services/shared/errors.js";

const RESET_PASSWORD_REASONS = new Set([
  "invalid_token",
  "expired_token",
  "used_token",
  "token_required",
  "passwords_mismatch",
] as const);

type ResetPasswordReason =
  | "invalid_token"
  | "expired_token"
  | "used_token"
  | "token_required"
  | "passwords_mismatch";

function getResetPasswordReason(
  reason: string | undefined,
): ResetPasswordReason | undefined {
  if (
    reason === undefined ||
    !RESET_PASSWORD_REASONS.has(reason as ResetPasswordReason)
  ) {
    return undefined;
  }

  return reason as ResetPasswordReason;
}

export default {
  async register(
    context: HttpContext<RegisterInput>,
  ): Promise<RegisterResponse> {
    context.logger.info("register handler");

    const payload = getTypedPayload(context);
    const result = await authService.register(
      payload,
      context.auth,
      context.session,
    );

    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return result.value;
  },

  async login(context: HttpContext<LoginInput>): Promise<LoginResponse> {
    context.logger.info("login handler");

    const payload = getTypedPayload(context);
    const result = await authService.login(payload, context.auth);

    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return result.value;
  },

  async logout(context: HttpContext<EmptyFormInput>): Promise<LogoutResponse> {
    context.logger.info("logout handler");
    const result = await authService.logout(context.auth);
    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return result.value;
  },

  async me(context: HttpContext<EmptyFormInput>): Promise<CurrentUserResponse> {
    const userId = context.auth.getUserId();
    if (userId === null) {
      await context.auth.logout();
      return mapControllerError(context, unauthorized());
    }

    const result = await authService.getCurrentUser(userId);
    if (Result.isError(result)) {
      if (result.error._tag === "Unauthorized") {
        await context.auth.logout();
      }
      return mapControllerError(context, result.error);
    }

    return result.value;
  },

  async logoutAll(
    context: HttpContext<EmptyFormInput>,
  ): Promise<LogoutAllResponse> {
    context.logger.info("logoutAll handler");
    const result = await authService.logoutAll(context.auth);
    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return result.value;
  },

  async changePassword(
    context: HttpContext<ChangePasswordInput>,
  ): Promise<ChangePasswordResponse> {
    context.logger.info("changePassword handler");

    if (!context.auth.check()) {
      return mapControllerError(context, unauthorized());
    }

    const userId = context.auth.getUserId();
    if (userId === null) {
      return mapControllerError(context, unauthorized());
    }

    const payload = getTypedPayload(context);
    const result = await authService.changePassword(userId, payload);
    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return { status: "success" };
  },

  async forgotPassword(
    context: HttpContext<ForgotPasswordInput>,
  ): Promise<ForgotPasswordResponse> {
    const payload = getTypedPayload(context);
    const result = await passwordResetService.requestPasswordReset(
      payload.email,
    );
    return {
      status: "success",
      message: Result.isOk(result)
        ? result.value.message
        : GENERIC_RESET_MESSAGE,
    };
  },

  async resetPassword(
    context: HttpContext<ResetPasswordInput>,
  ): Promise<ResetPasswordResponse> {
    const payload = getTypedPayload(context);
    const result = await passwordResetService.resetPassword(
      payload.token,
      payload.password,
      payload.passwordConfirm,
    );
    if (Result.isError(result)) {
      const error = mapControllerError(context, result.error);
      const reason = getResetPasswordReason(appErrorReason(result.error));
      const { reason: _rawReason, ...baseError } = error;
      return reason !== undefined ? { ...baseError, reason } : baseError;
    }

    return { status: "success" };
  },

  async verifyEmail(
    context: HttpContext<VerifyEmailInput>,
  ): Promise<VerifyEmailResponse> {
    const payload = getTypedPayload(context);
    const result = await emailVerificationService.verifyEmail(payload.token);
    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return { status: "success", message: result.value.message };
  },

  async resendVerificationEmail(
    context: HttpContext<EmptyFormInput>,
  ): Promise<ResendVerificationEmailResponse> {
    const userId = context.auth.getUserId();
    if (userId === null) {
      return mapControllerError(context, unauthorized());
    }

    const result = await emailVerificationService.queueVerificationEmail(
      userId,
    );
    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    return { status: "success", message: result.value.message };
  },
};
