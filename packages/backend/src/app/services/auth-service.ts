import { hashPassword, validatePassword } from "metautil";
import { Result } from "better-result";
import type { Auth, Session } from "#vendor/types/types.js";
import { userRepository } from "#app/repositories/index.js";
import { userTransformer } from "#app/transformers/index.js";
import {
  badRequest,
  conflict,
  internalMessage,
  notFound,
  unauthorized,
  type AppResult,
} from "#app/services/shared/errors.js";
import { tryInternal } from "#app/services/shared/result-helpers.js";
import { emailVerificationService } from "#app/services/email-verification-service.js";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from "shared/schemas";

export const authService = {
  async register(
    payload: RegisterInput,
    auth: Auth,
    session: Session,
  ): Promise<
    AppResult<{
      status: "success";
      user: ReturnType<typeof userTransformer.serialize>;
    }>
  > {
    const { name, password } = payload;
    const email = payload.email.toLowerCase();

    const existResult = await tryInternal(
      () => userRepository.findByEmail(email),
      "Failed to load user by email",
    );
    if (Result.isError(existResult)) {
      return Result.err(existResult.error);
    }

    const exist = existResult.value;
    if (exist !== undefined) {
      return Result.err(conflict("Email already exist"));
    }

    const hashResult = await tryInternal(
      () => hashPassword(password),
      "Failed to hash password",
    );
    if (Result.isError(hashResult)) {
      return Result.err(hashResult.error);
    }

    const userCreatedResult = await tryInternal(
      () =>
        userRepository.create({
          name,
          email,
          password: hashResult.value,
          // sessionToken is auto-generated via $defaultFn in schema
        }),
      "Failed to create user",
    );
    if (Result.isError(userCreatedResult)) {
      return Result.err(userCreatedResult.error);
    }

    const userCreated = userCreatedResult.value;

    void emailVerificationService.sendVerificationEmailAfterRegistration(
      userCreated.id,
    );

    const destroySessionResult = await tryInternal(
      () => session.destroySession(session.sessionInfo?.id),
      "Failed to destroy session",
    );
    if (Result.isError(destroySessionResult)) {
      return Result.err(destroySessionResult.error);
    }

    const loggedInResult = await tryInternal(
      () => auth.login(String(userCreated.id), userCreated.sessionToken),
      "Failed to log in user",
    );
    if (Result.isError(loggedInResult)) {
      return Result.err(loggedInResult.error);
    }

    const loggedIn = loggedInResult.value;
    if (!loggedIn) {
      return Result.err(
        internalMessage("Failed to log in newly registered user"),
      );
    }

    return Result.ok({
      status: "success",
      user: userTransformer.serialize(userCreated),
    });
  },

  async login(
    payload: LoginInput,
    auth: Auth,
  ): Promise<
    AppResult<{
      status: "success";
      user: ReturnType<typeof userTransformer.serialize>;
    }>
  > {
    const { password } = payload;
    const email = payload.email.toLowerCase();

    const userResult = await tryInternal(
      () => userRepository.findByEmail(email),
      "Failed to load user by email",
    );
    if (Result.isError(userResult)) {
      return Result.err(userResult.error);
    }

    const user = userResult.value;
    if (user === undefined) {
      return Result.err(unauthorized("Invalid email or password"));
    }

    if (user.password === null || user.password === "") {
      return Result.err(badRequest("Please use social login for this account"));
    }

    const passwordHash = user.password;
    const validResult = await tryInternal(
      () => validatePassword(password, passwordHash),
      "Failed to validate password",
    );
    if (Result.isError(validResult)) {
      return Result.err(validResult.error);
    }

    const valid = validResult.value;
    if (!valid) {
      return Result.err(unauthorized("Invalid email or password"));
    }

    const loggedInResult = await tryInternal(
      () => auth.login(String(user.id), user.sessionToken),
      "Failed to log in user",
    );
    if (Result.isError(loggedInResult)) {
      return Result.err(loggedInResult.error);
    }

    const loggedIn = loggedInResult.value;
    if (!loggedIn) {
      return Result.err(internalMessage("Failed to log in user"));
    }

    return Result.ok({
      status: "success",
      user: userTransformer.serialize(user),
    });
  },

  async logout(
    auth: Auth,
  ): Promise<AppResult<{ status: "success" }>> {
    const result = await tryInternal(
      () => auth.logout(),
      "Failed to log out user",
    );
    if (Result.isError(result)) {
      return Result.err(result.error);
    }

    if (!result.value) {
      return Result.err(internalMessage("Failed to log out user"));
    }

    return Result.ok({ status: "success" });
  },

  async logoutAll(
    auth: Auth,
  ): Promise<AppResult<{ status: "success"; deletedCount: number }>> {
    const result = await tryInternal(
      () => auth.logoutAll(),
      "Failed to log out all sessions",
    );
    if (Result.isError(result)) {
      return Result.err(result.error);
    }

    return Result.ok({
      status: "success",
      deletedCount: result.value,
    });
  },

  async changePassword(
    userId: bigint,
    payload: ChangePasswordInput,
  ): Promise<AppResult<{ status: "success" }>> {
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

    const storedPassword = user.password;
    const hasPassword = storedPassword !== null && storedPassword !== "";
    if (hasPassword) {
      if (
        payload.currentPassword === undefined ||
        payload.currentPassword === ""
      ) {
        return Result.err(badRequest("Current password is required"));
      }

      const currentPassword = payload.currentPassword;
      const validResult = await tryInternal(
        () => validatePassword(currentPassword, storedPassword),
        "Failed to validate current password",
      );
      if (Result.isError(validResult)) {
        return Result.err(validResult.error);
      }

      const valid = validResult.value;
      if (!valid) {
        return Result.err(badRequest("Current password is incorrect"));
      }
    }

    const newPasswordHashResult = await tryInternal(
      () => hashPassword(payload.newPassword),
      "Failed to hash password",
    );
    if (Result.isError(newPasswordHashResult)) {
      return Result.err(newPasswordHashResult.error);
    }

    const updatedResult = await tryInternal(
      () =>
        userRepository.update(userId, {
          password: newPasswordHashResult.value,
        }),
      "Failed to update password",
    );
    if (Result.isError(updatedResult)) {
      return Result.err(updatedResult.error);
    }

    const updated = updatedResult.value;
    if (updated === undefined) {
      return Result.err(internalMessage("Failed to update password"));
    }

    return Result.ok({ status: "success" });
  },
};
