import { createHash, randomBytes } from "node:crypto";
import { hashPassword } from "metautil";
import { nanoid } from "nanoid";
import appConfig from "#config/app.js";
import logger from "#logger";
import {
  passwordResetRepository,
  userRepository,
} from "#app/repositories/index.js";
import { emailService } from "#app/services/email-service.js";
import { Result } from "better-result";
import {
  badRequest,
  internal,
  internalMessage,
  notFound,
  type AppResult,
  appErrorMessage,
} from "#app/services/shared/errors.js";
import { tryInternal } from "#app/services/shared/result-helpers.js";
import { destroyAllSessions } from "#vendor/utils/session/redis-session-storage.js";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
export const GENERIC_RESET_MESSAGE =
  "If an account with that email exists, a reset link will be sent shortly.";
// Email clients do not support app CSS variables reliably, so this palette stays inline on purpose.
const EMAIL_BRAND = {
  accent: "#A8627A",
  accentHover: "#96516A",
  canvas: "#FAF0F3",
  surface: "#FFFFFF",
  textPrimary: "#2C3440",
  textSecondary: "#5E6977",
  border: "#D8DDE6",
  accentSoft: "#F6E8EE",
  accentLine: "#E7C8D3",
} as const;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createResetToken(): string {
  return randomBytes(32).toString("base64url");
}

function buildResetUrl(token: string): string {
  return `${appConfig.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildResetEmailContent(
  name: string,
  resetUrl: string,
): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Reset your password";
  const trimmedName = name.trim();
  const safeName = trimmedName === "" ? "" : `, ${trimmedName}`;
  const escapedGreeting =
    trimmedName === "" ? "" : `, ${escapeHtml(trimmedName)}`;
  const escapedResetUrl = escapeHtml(resetUrl);

  const text = [
    `Hello${safeName}.`,
    "",
    "We received a request to reset your password.",
    "Open this link to choose a new password:",
    resetUrl,
    "",
    "This link will expire in 1 hour.",
    "If you did not request a password reset, you can safely ignore this email.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:${EMAIL_BRAND.canvas};font-family:Inter,Arial,sans-serif;color:${EMAIL_BRAND.textPrimary};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Reset your ITVibe Party password.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${EMAIL_BRAND.canvas};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;">
            <tr>
              <td style="padding-bottom:16px;">
                <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:${EMAIL_BRAND.accentSoft};border:1px solid ${EMAIL_BRAND.accentLine};color:${EMAIL_BRAND.accent};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                  ITVibe Party
                </div>
              </td>
            </tr>
            <tr>
              <td style="border-radius:28px;background:${EMAIL_BRAND.surface};border:1px solid ${EMAIL_BRAND.border};box-shadow:0 18px 48px rgba(44,52,64,0.08);overflow:hidden;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:40px 40px 24px;background:linear-gradient(180deg, rgba(168,98,122,0.16) 0%, rgba(168,98,122,0.05) 100%);border-bottom:1px solid ${EMAIL_BRAND.border};">
                      <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_BRAND.accent};margin-bottom:14px;">
                        Password reset
                      </div>
                      <h1 style="margin:0;font-size:34px;line-height:1.12;font-weight:800;color:${EMAIL_BRAND.textPrimary};">
                        Choose a new password
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px 40px 40px;">
                      <p style="margin:0 0 18px;font-size:18px;line-height:1.65;color:${EMAIL_BRAND.textPrimary};">
                        Hello${escapedGreeting}.
                      </p>
                      <p style="margin:0 0 28px;font-size:17px;line-height:1.7;color:${EMAIL_BRAND.textSecondary};">
                        We received a request to reset your ITVibe Party password. Use the button below to set a new one.
                      </p>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
                        <tr>
                          <td align="center" bgcolor="${EMAIL_BRAND.accent}" style="border-radius:16px;box-shadow:0 14px 26px rgba(168,98,122,0.24);">
                            <a
                              href="${escapedResetUrl}"
                              style="display:inline-block;padding:17px 28px;font-size:17px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:16px;background:${EMAIL_BRAND.accent};"
                            >
                              Reset password
                            </a>
                          </td>
                        </tr>
                      </table>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;border-collapse:separate;">
                        <tr>
                          <td style="padding:18px 20px;border-radius:18px;background:${EMAIL_BRAND.accentSoft};border:1px solid ${EMAIL_BRAND.accentLine};">
                            <div style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${EMAIL_BRAND.accent};">
                              Alternative link
                            </div>
                            <div style="font-size:15px;line-height:1.65;color:${EMAIL_BRAND.textSecondary};word-break:break-word;">
                              If the button does not work, open this link:<br />
                              <a href="${escapedResetUrl}" style="color:${EMAIL_BRAND.accent};text-decoration:underline;">
                                ${escapedResetUrl}
                              </a>
                            </div>
                          </td>
                        </tr>
                      </table>
                      <div style="padding-top:20px;border-top:1px solid ${EMAIL_BRAND.border};font-size:14px;line-height:1.7;color:${EMAIL_BRAND.textSecondary};">
                        This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

export const passwordResetService = {
  async requestPasswordReset(
    email: string,
  ): Promise<AppResult<{ message: string }>> {
    const normalizedEmail = email.trim().toLowerCase();
    let user:
      | Awaited<ReturnType<typeof userRepository.findByEmail>>
      | undefined;
    if (normalizedEmail !== "") {
      const userResult = await tryInternal(
        () => userRepository.findByEmail(normalizedEmail),
        "Failed to load user by email",
      );
      if (Result.isError(userResult)) {
        logger.warn(
          { err: userResult.error, email: normalizedEmail },
          "Failed to load user by email for password reset",
        );
        return Result.ok({ message: GENERIC_RESET_MESSAGE });
      }
      user = userResult.value;
    }

    if (user !== undefined) {
      void passwordResetService.sendPasswordResetEmailInBackground(
        user.id,
        "manual request",
      );
    }

    return Result.ok({ message: GENERIC_RESET_MESSAGE });
  },

  async sendPasswordResetEmail(
    userId: bigint,
  ): Promise<AppResult<{ message: string }>> {
    const userResult = await tryInternal(
      () => userRepository.findById(userId),
      "Failed to load user",
    );
    if (Result.isError(userResult)) {
      return Result.err(userResult.error);
    }

    const user = userResult.value;
    if (user === undefined) {
      return Result.err(notFound("User", "User not found"));
    }

    const invalidateResult = await tryInternal(
      () => passwordResetRepository.invalidatePendingByUserId(userId),
      "Failed to invalidate password reset tokens",
    );
    if (Result.isError(invalidateResult)) {
      return Result.err(invalidateResult.error);
    }

    const rawToken = createResetToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    const createResult = await tryInternal(
      () =>
        passwordResetRepository.create({
          userId,
          tokenHash: hashToken(rawToken),
          expiresAt,
        }),
      "Failed to create password reset token",
    );
    if (Result.isError(createResult)) {
      return Result.err(createResult.error);
    }

    const resetUrl = buildResetUrl(rawToken);
    const emailContent = buildResetEmailContent(user.name, resetUrl);
    const sendResult = await emailService.send({
      to: user.email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    if (Result.isError(sendResult)) {
      return Result.err(
        internal(sendResult.error, "Failed to send password reset email"),
      );
    }

    return Result.ok({ message: "Password reset email sent" });
  },

  async resetPassword(
    token: string,
    password: string,
    passwordConfirm: string,
  ): Promise<AppResult<{ status: "success" }>> {
    const normalizedToken = token.trim();
    if (normalizedToken === "") {
      return Result.err(
        badRequest("Password reset token is required", "token_required"),
      );
    }

    if (password !== passwordConfirm) {
      return Result.err(
        badRequest("Passwords do not match", "passwords_mismatch"),
      );
    }

    const resetTokenResult = await tryInternal(
      () => passwordResetRepository.findByTokenHash(hashToken(normalizedToken)),
      "Failed to load password reset token",
    );
    if (Result.isError(resetTokenResult)) {
      return Result.err(resetTokenResult.error);
    }

    const resetToken = resetTokenResult.value;
    if (resetToken === undefined) {
      return Result.err(
        badRequest("Password reset link is invalid", "invalid_token"),
      );
    }

    if (resetToken.usedAt !== null) {
      return Result.err(
        badRequest("Password reset link has already been used", "used_token"),
      );
    }

    if (resetToken.expiresAt.getTime() < Date.now()) {
      const markExpiredResult = await tryInternal(
        () => passwordResetRepository.markUsed(resetToken.id),
        "Failed to mark password reset token used",
      );
      if (Result.isError(markExpiredResult)) {
        return Result.err(markExpiredResult.error);
      }

      return Result.err(
        badRequest("Password reset link has expired", "expired_token"),
      );
    }

    const userResult = await tryInternal(
      () => userRepository.findById(resetToken.userId),
      "Failed to load user",
    );
    if (Result.isError(userResult)) {
      return Result.err(userResult.error);
    }

    const user = userResult.value;
    if (user === undefined) {
      return Result.err(notFound("User", "User not found"));
    }

    const newPasswordHashResult = await tryInternal(
      () => hashPassword(password),
      "Failed to hash password",
    );
    if (Result.isError(newPasswordHashResult)) {
      return Result.err(newPasswordHashResult.error);
    }

    const newPasswordHash = newPasswordHashResult.value;
    const previousSessionToken = user.sessionToken;

    const updatedUserResult = await tryInternal(
      () =>
        userRepository.update(user.id, {
          password: newPasswordHash,
          sessionToken: nanoid(),
        }),
      "Failed to update password",
    );
    if (Result.isError(updatedUserResult)) {
      return Result.err(updatedUserResult.error);
    }

    const updatedUser = updatedUserResult.value;
    if (updatedUser === undefined) {
      return Result.err(internalMessage("Failed to update password"));
    }

    const destroySessionsResult = await tryInternal(
      () => destroyAllSessions(previousSessionToken),
      "Failed to destroy sessions",
    );
    if (Result.isError(destroySessionsResult)) {
      return Result.err(destroySessionsResult.error);
    }

    const usedTokenResult = await tryInternal(
      () => passwordResetRepository.markUsed(resetToken.id),
      "Failed to mark password reset token used",
    );
    if (Result.isError(usedTokenResult)) {
      return Result.err(usedTokenResult.error);
    }

    const usedToken = usedTokenResult.value;
    if (usedToken === undefined) {
      logger.warn(
        { resetTokenId: String(resetToken.id), userId: String(user.id) },
        "Password reset succeeded but reset token was not marked used",
      );
    }

    return Result.ok({ status: "success" });
  },

  async sendPasswordResetEmailInBackground(
    userId: bigint,
    reason: "manual request",
  ): Promise<void> {
    try {
      const result = await this.sendPasswordResetEmail(userId);
      if (Result.isError(result)) {
        logger.warn(
          {
            userId: String(userId),
            reason: appErrorMessage(result.error),
            trigger: reason,
          },
          "Failed to send password reset email in background",
        );
      }
    } catch (err) {
      logger.error(
        { err, userId: String(userId), trigger: reason },
        "Unexpected error while sending password reset email in background",
      );
    }
  },
};
