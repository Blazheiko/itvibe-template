import { hashPassword, validatePassword } from "metautil";
import { Result } from "better-result";
import type { Auth, Session } from "#vendor/types/types.js";
import {
  smsAuthChallengeRepository,
  userRepository,
} from "#app/repositories/index.js";
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
import { generateWsToken } from "#app/services/auth/generate-ws-token-service.js";
import { getWsUrl } from "#app/services/communication/get-ws-url-service.js";
import { emailVerificationService } from "#app/services/auth/email-verification-service.js";
import logger from "#vendor/utils/logger.js";
import { maskPhoneForLogs } from "#vendor/utils/helpers/mask-sensitive.js";
import { authConfig } from "#config/auth.js";
import {
  smsVerificationProvider,
  type SmsVerificationFlow,
} from "#app/services/auth/sms-verification-provider.js";
import { consumeAuthThrottle } from "#app/services/auth/auth-throttle-service.js";
import {
  hashOtpVerificationCode,
  verifyOtpVerificationCode,
} from "#app/services/auth/otp-verification-hash.js";
import {
  buildResendCooldownError,
  extractChallengeSessionId,
  extractChallengeUserId,
} from "#app/services/auth/sms-auth-challenge-metadata.js";
import {
  PHONE_SMS_SEND_THROTTLE_SCOPE,
  PENDING_SMS_CODE_HASH_PLACEHOLDER,
} from "./sms-auth-challenge-constants.js";
import { looksLikePhoneNumber, normalizePhoneNumber } from "shared/utils";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterEmailInput,
  RegisterPhoneStartInput,
  RegisterPhoneConfirmInput,
  RegisterPhoneCompleteInput,
  LinkPhoneStartInput,
  LinkPhoneConfirmInput,
  LinkEmailStartInput,
} from "shared/schemas";
import type { Logger } from "pino";
import { getSessionCsrfToken } from "#vendor/utils/session/csrf-token.js";

const REGISTER_PHONE_FLOW: SmsVerificationFlow = "register_phone";
const LINK_PHONE_FLOW: SmsVerificationFlow = "link_phone";

type AuthSuccessPayload = {
  status: "success";
  user: ReturnType<typeof userTransformer.serialize>;
  wsUrl: string;
  wsToken: string;
  csrfToken?: string;
};

type GenericAcceptedPayload = {
  status: "success";
  message: string;
};

type RegisterEmailFlowPayload = AuthSuccessPayload | GenericAcceptedPayload;

const GENERIC_EMAIL_REGISTRATION_MESSAGE =
  "If the email can be used for registration, continue with the verification instructions sent to your inbox.";

function isChallengeExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

function assertPhoneAuthEnabled(): AppResult<never> | undefined {
  if (authConfig.phoneAuthEnabled) {
    return undefined;
  }

  return Result.err(badRequest("Phone authentication is disabled"));
}

function resolveLoginIdentifier(payload: LoginInput): string {
  return "identifier" in payload ? payload.identifier : payload.email;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(
  input: string,
  defaultCountry?: string,
): AppResult<string> {
  try {
    return Result.ok(normalizePhoneNumber(input, defaultCountry));
  } catch (error) {
    if (error instanceof Error) {
      return Result.err(badRequest(error.message));
    }

    return Result.err(
      badRequest("Phone number must be valid and in a supported format"),
    );
  }
}

async function createPasswordHash(password: string) {
  return await tryInternal(
    () => hashPassword(password),
    "Failed to hash password",
  );
}

async function requireCurrentPasswordReauth(
  userId: bigint,
  currentPassword: string,
) {
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

  if (user.password === null || user.password === "") {
    return Result.err(
      badRequest("Set a password before managing recovery methods"),
    );
  }

  const validResult = await tryInternal(
    () => validatePassword(currentPassword, user.password!),
    "Failed to validate current password",
  );
  if (Result.isError(validResult)) {
    return Result.err(validResult.error);
  }

  if (!validResult.value) {
    return Result.err(badRequest("Current password is incorrect"));
  }

  return Result.ok(user);
}

async function buildAuthSuccess(
  user: Awaited<ReturnType<typeof userRepository.create>>,
  auth: Auth,
  session: Session,
  loginFailureMessage = "Failed to log in user",
): Promise<AppResult<AuthSuccessPayload>> {
  const loggedInResult = await tryInternal(
    () => auth.login(String(user.id), user.sessionToken),
    "Failed to log in user",
  );
  if (Result.isError(loggedInResult)) {
    return Result.err(loggedInResult.error);
  }

  if (!loggedInResult.value) {
    return Result.err(internalMessage(loginFailureMessage));
  }

  const sessionInfo = session.sessionInfo;
  let wsToken = "";
  if (sessionInfo !== null) {
    const wsTokenResult = await tryInternal(
      () => generateWsToken(sessionInfo, String(user.id)),
      "Failed to generate WebSocket token",
    );
    if (Result.isError(wsTokenResult)) {
      return Result.err(wsTokenResult.error);
    }

    wsToken = wsTokenResult.value;
  }

  const csrfToken = getSessionCsrfToken(sessionInfo);
  const payload: AuthSuccessPayload = {
    status: "success",
    user: userTransformer.serialize(user),
    wsUrl: wsToken !== "" ? getWsUrl() : "",
    wsToken,
  };
  if (csrfToken !== undefined) {
    payload.csrfToken = csrfToken;
  }
  return Result.ok(payload);
}

async function persistRegisteredUser(
  createUserInput: {
    name: string;
    email: string | null;
    phone: string | null;
    passwordHash: string;
  },
  options: {
    sendEmailVerification: boolean;
    challengeIdToInvalidate?: string;
  },
): Promise<AppResult<Awaited<ReturnType<typeof userRepository.create>>>> {
  const userCreatedResult = await tryInternal(
    () =>
      userRepository.create({
        name: createUserInput.name,
        email: createUserInput.email,
        phone: createUserInput.phone,
        password: createUserInput.passwordHash,
      }),
    "Failed to create user",
  );
  if (Result.isError(userCreatedResult)) {
    return Result.err(userCreatedResult.error);
  }

  const userCreated = userCreatedResult.value;

  if (options.sendEmailVerification) {
    void emailVerificationService.sendVerificationEmailAfterRegistration(
      userCreated.id,
    );
  }

  if (options.challengeIdToInvalidate !== undefined) {
    await smsAuthChallengeRepository.markInvalidated(
      options.challengeIdToInvalidate,
    );
  }

  return Result.ok(userCreated);
}

async function finalizeRegistration(
  createUserInput: {
    name: string;
    email: string | null;
    phone: string | null;
    passwordHash: string;
  },
  auth: Auth,
  session: Session,
  options: {
    sendEmailVerification: boolean;
    challengeIdToInvalidate?: string;
    loginFailureMessage?: string;
  },
): Promise<AppResult<AuthSuccessPayload>> {
  const persistOptions: {
    sendEmailVerification: boolean;
    challengeIdToInvalidate?: string;
  } = {
    sendEmailVerification: options.sendEmailVerification,
  };
  if (options.challengeIdToInvalidate !== undefined) {
    persistOptions.challengeIdToInvalidate = options.challengeIdToInvalidate;
  }

  const userCreatedResult = await persistRegisteredUser(
    createUserInput,
    persistOptions,
  );
  if (Result.isError(userCreatedResult)) {
    return Result.err(userCreatedResult.error);
  }

  const destroySessionResult = await tryInternal(
    () => session.destroySession(session.sessionInfo?.id),
    "Failed to destroy session",
  );
  if (Result.isError(destroySessionResult)) {
    return Result.err(destroySessionResult.error);
  }

  return await buildAuthSuccess(
    userCreatedResult.value,
    auth,
    session,
    options.loginFailureMessage ?? "Failed to log in user",
  );
}

async function registerEmailFlow(
  payload: RegisterEmailInput,
  auth: Auth,
  session: Session,
  _loggerInstance: Logger,
  requestMeta: { ipAddress: string },
): Promise<AppResult<RegisterEmailFlowPayload>> {
  const { name, password } = payload;
  const email = normalizeEmail(payload.email);

  const ipThrottle = await tryInternal(
    () =>
      consumeAuthThrottle({
        scope: "register_email_ip",
        key: requestMeta.ipAddress,
        limit: authConfig.emailRegisterMaxAttemptsPerIpPerHour,
        windowSeconds: 60 * 60,
      }),
    "Failed to enforce email registration IP throttle",
  );
  if (Result.isError(ipThrottle)) {
    return Result.err(ipThrottle.error);
  }
  if (!ipThrottle.value.allowed) {
    return Result.err(
      badRequest("Too many registration attempts. Please try again later."),
    );
  }

  const emailThrottle = await tryInternal(
    () =>
      consumeAuthThrottle({
        scope: "register_email_identifier",
        key: email,
        limit: authConfig.emailRegisterMaxAttemptsPerEmailPerHour,
        windowSeconds: 60 * 60,
      }),
    "Failed to enforce email registration identifier throttle",
  );
  if (Result.isError(emailThrottle)) {
    return Result.err(emailThrottle.error);
  }
  if (!emailThrottle.value.allowed) {
    return Result.err(
      badRequest("Too many registration attempts. Please try again later."),
    );
  }

  const existResult = await tryInternal(
    () => userRepository.findByEmail(email),
    "Failed to load user by email",
  );
  if (Result.isError(existResult)) {
    return Result.err(existResult.error);
  }

  if (existResult.value !== undefined) {
    return Result.ok({
      status: "success",
      message: GENERIC_EMAIL_REGISTRATION_MESSAGE,
    });
  }

  const hashResult = await createPasswordHash(password);
  if (Result.isError(hashResult)) {
    return Result.err(hashResult.error);
  }

  if (!authConfig.strictRegistration) {
    return await finalizeRegistration(
      {
        name,
        email,
        phone: null,
        passwordHash: hashResult.value,
      },
      auth,
      session,
      {
        sendEmailVerification: true,
      },
    );
  }

  const registeredUserResult = await persistRegisteredUser(
    {
      name,
      email,
      phone: null,
      passwordHash: hashResult.value,
    },
    {
      sendEmailVerification: true,
    },
  );
  if (Result.isError(registeredUserResult)) {
    return Result.err(registeredUserResult.error);
  }

  const destroySessionResult = await tryInternal(
    () => session.destroySession(session.sessionInfo?.id),
    "Failed to destroy session",
  );
  if (Result.isError(destroySessionResult)) {
    return Result.err(destroySessionResult.error);
  }

  return Result.ok({
    status: "success",
    message: GENERIC_EMAIL_REGISTRATION_MESSAGE,
  });
}

export const authService = {
  async registerByEmail(
    payload: RegisterEmailInput,
    auth: Auth,
    session: Session,
    loggerInstance: Logger,
    requestMeta: { ipAddress: string },
  ): Promise<AppResult<RegisterEmailFlowPayload>> {
    return await registerEmailFlow(
      payload,
      auth,
      session,
      loggerInstance,
      requestMeta,
    );
  },

  async startPhoneRegistration(
    payload: RegisterPhoneStartInput,
    requestMeta: { ipAddress: string; sessionId: string | null },
  ): Promise<
    AppResult<{
      status: "success";
      challengeId: string;
      expiresAt: string;
      resendAvailableAt: string;
    }>
  > {
    const gateResult = assertPhoneAuthEnabled();
    if (gateResult !== undefined) {
      return gateResult;
    }

    const normalizedPhoneResult = normalizePhone(
      payload.phone,
      payload.defaultCountry,
    );
    if (Result.isError(normalizedPhoneResult)) {
      return Result.err(normalizedPhoneResult.error);
    }

    const phone = normalizedPhoneResult.value;

    const ipThrottle = await tryInternal(
      () =>
        consumeAuthThrottle({
          scope: "register_phone_ip",
          key: requestMeta.ipAddress,
          limit: authConfig.smsMaxSendsPerIpPerHour,
          windowSeconds: 60 * 60,
        }),
      "Failed to enforce auth IP throttle",
    );
    if (Result.isError(ipThrottle)) {
      return Result.err(ipThrottle.error);
    }
    if (!ipThrottle.value.allowed) {
      return Result.err(
        badRequest("Too many verification attempts. Please try again later."),
      );
    }

    const phoneThrottle = await tryInternal(
      () =>
        consumeAuthThrottle({
          scope: PHONE_SMS_SEND_THROTTLE_SCOPE,
          key: phone,
          limit: authConfig.smsMaxSendsPerPhonePerHour,
          windowSeconds: 60 * 60,
        }),
      "Failed to enforce auth phone throttle",
    );
    if (Result.isError(phoneThrottle)) {
      return Result.err(phoneThrottle.error);
    }
    if (!phoneThrottle.value.allowed) {
      return Result.err(
        badRequest("Too many verification attempts. Please try again later."),
      );
    }

    const existingUserResult = await tryInternal(
      () => userRepository.findByPhone(phone),
      "Failed to load user by phone",
    );
    if (Result.isError(existingUserResult)) {
      return Result.err(existingUserResult.error);
    }
    const collisionDetected = existingUserResult.value !== undefined;

    const pendingChallengeResult = await tryInternal(
      () =>
        smsAuthChallengeRepository.findLatestPendingForPhoneFlow(
          phone,
          REGISTER_PHONE_FLOW,
        ),
      "Failed to load pending SMS auth challenge",
    );
    if (Result.isError(pendingChallengeResult)) {
      return Result.err(pendingChallengeResult.error);
    }
    if (
      pendingChallengeResult.value !== undefined &&
      pendingChallengeResult.value.resendAvailableAt.getTime() > Date.now()
    ) {
      return Result.err(
        buildResendCooldownError(
          pendingChallengeResult.value.resendAvailableAt,
        ),
      );
    }

    await smsAuthChallengeRepository.invalidatePendingForPhoneFlow(
      phone,
      REGISTER_PHONE_FLOW,
    );

    const now = Date.now();
    const expiresAt = new Date(now + authConfig.smsChallengeTtlSeconds * 1000);
    const resendAvailableAt = new Date(
      now + authConfig.smsResendCooldownSeconds * 1000,
    );

    const createdResult = await tryInternal(
      () =>
        smsAuthChallengeRepository.create({
          flow: REGISTER_PHONE_FLOW,
          phone,
          codeHash: PENDING_SMS_CODE_HASH_PLACEHOLDER,
          expiresAt,
          resendAvailableAt,
          providerRequestId: null,
          metadata: {
            ipAddress: requestMeta.ipAddress,
            provider: authConfig.smsProvider,
            ...(requestMeta.sessionId !== null
              ? { sessionId: requestMeta.sessionId }
              : {}),
          },
        }),
      "Failed to persist SMS auth challenge",
    );
    if (Result.isError(createdResult)) {
      return Result.err(createdResult.error);
    }

    const issueCodeResult = await tryInternal(
      () =>
        smsVerificationProvider.issueVerificationCode({
          phone,
          flow: REGISTER_PHONE_FLOW,
        }),
      "Failed to issue SMS verification code",
    );
    if (Result.isError(issueCodeResult)) {
      await smsAuthChallengeRepository.markInvalidated(createdResult.value.id);
      return Result.err(issueCodeResult.error);
    }

    const issuedChallengeResult = await tryInternal(
      () =>
        smsAuthChallengeRepository.markIssued(createdResult.value.id, {
          codeHash: hashOtpVerificationCode(issueCodeResult.value.code),
          providerRequestId: issueCodeResult.value.providerRequestId,
          metadata: {
            ipAddress: requestMeta.ipAddress,
            provider: authConfig.smsProvider,
            ...(requestMeta.sessionId !== null
              ? { sessionId: requestMeta.sessionId }
              : {}),
          },
        }),
      "Failed to persist issued SMS challenge",
    );
    if (Result.isError(issuedChallengeResult)) {
      await smsAuthChallengeRepository.markInvalidated(createdResult.value.id);
      return Result.err(issuedChallengeResult.error);
    }
    if (issuedChallengeResult.value === undefined) {
      await smsAuthChallengeRepository.markInvalidated(createdResult.value.id);
      return Result.err(
        badRequest("Phone registration challenge is no longer valid"),
      );
    }

    if (collisionDetected) {
      logger.info(
        {
          phoneMasked: maskPhoneForLogs(phone),
          flow: REGISTER_PHONE_FLOW,
          event: "phone_auth_collision_detected",
        },
        "Phone registration collision detected",
      );
    }

    return Result.ok({
      status: "success",
      challengeId: issuedChallengeResult.value.id,
      expiresAt: issuedChallengeResult.value.expiresAt.toISOString(),
      resendAvailableAt:
        issuedChallengeResult.value.resendAvailableAt.toISOString(),
    });
  },

  async confirmPhoneRegistration(
    payload: RegisterPhoneConfirmInput,
    requestMeta: { ipAddress: string },
  ): Promise<
    AppResult<{
      status: "success";
      challengeId: string;
      verified: true;
    }>
  > {
    const gateResult = assertPhoneAuthEnabled();
    if (gateResult !== undefined) {
      return gateResult;
    }

    const ipThrottle = await tryInternal(
      () =>
        consumeAuthThrottle({
          scope: "confirm_phone_ip",
          key: requestMeta.ipAddress,
          limit: authConfig.smsMaxConfirmAttemptsPerIpPerHour,
          windowSeconds: 60 * 60,
        }),
      "Failed to enforce phone confirmation IP throttle",
    );
    if (Result.isError(ipThrottle)) {
      return Result.err(ipThrottle.error);
    }
    if (!ipThrottle.value.allowed) {
      return Result.err(
        badRequest("Too many verification attempts. Please try again later."),
      );
    }
    const challengeResult = await tryInternal(
      () => smsAuthChallengeRepository.findById(payload.challengeId),
      "Failed to load SMS auth challenge",
    );
    if (Result.isError(challengeResult)) {
      return Result.err(challengeResult.error);
    }

    const challenge = challengeResult.value;
    if (challenge === undefined || challenge.flow !== REGISTER_PHONE_FLOW) {
      return Result.err(
        notFound("Challenge", "Phone registration challenge not found"),
      );
    }

    if (
      challenge.invalidatedAt !== null ||
      challenge.confirmedAt !== null ||
      isChallengeExpired(challenge.expiresAt)
    ) {
      return Result.err(
        badRequest("Phone registration challenge is no longer valid"),
      );
    }

    if (!verifyOtpVerificationCode(payload.code, challenge.codeHash)) {
      const updatedChallenge =
        await smsAuthChallengeRepository.incrementAttemptCount(challenge.id);
      if (
        (updatedChallenge?.attemptCount ?? challenge.attemptCount + 1) >=
        authConfig.smsMaxInvalidAttempts
      ) {
        await smsAuthChallengeRepository.markInvalidated(challenge.id);
      }

      return Result.err(badRequest("Invalid verification code"));
    }

    const confirmedResult = await tryInternal(
      () => smsAuthChallengeRepository.markConfirmed(challenge.id),
      "Failed to confirm SMS auth challenge",
    );
    if (Result.isError(confirmedResult)) {
      return Result.err(confirmedResult.error);
    }
    if (confirmedResult.value === undefined) {
      return Result.err(
        badRequest("Phone registration challenge is no longer valid"),
      );
    }

    return Result.ok({
      status: "success",
      challengeId: challenge.id,
      verified: true,
    });
  },

  async completePhoneRegistration(
    payload: RegisterPhoneCompleteInput,
    auth: Auth,
    session: Session,
    _loggerInstance: Logger,
    requestMeta: { sessionId: string | null },
  ): Promise<AppResult<AuthSuccessPayload>> {
    const gateResult = assertPhoneAuthEnabled();
    if (gateResult !== undefined) {
      return gateResult;
    }

    const challengeResult = await tryInternal(
      () => smsAuthChallengeRepository.findById(payload.challengeId),
      "Failed to load SMS auth challenge",
    );
    if (Result.isError(challengeResult)) {
      return Result.err(challengeResult.error);
    }

    const challenge = challengeResult.value;
    if (challenge === undefined || challenge.flow !== REGISTER_PHONE_FLOW) {
      return Result.err(
        notFound("Challenge", "Phone registration challenge not found"),
      );
    }

    if (
      challenge.invalidatedAt !== null ||
      challenge.confirmedAt === null ||
      isChallengeExpired(challenge.expiresAt)
    ) {
      return Result.err(
        badRequest(
          "Phone registration challenge must be confirmed before completing registration",
        ),
      );
    }

    const challengeSessionId = extractChallengeSessionId(challenge.metadata);
    if (
      challengeSessionId === null ||
      requestMeta.sessionId === null ||
      challengeSessionId !== requestMeta.sessionId
    ) {
      return Result.err(
        badRequest(
          "Phone registration challenge must be completed from the same session",
        ),
      );
    }

    const existingUserResult = await tryInternal(
      () => userRepository.findByPhone(challenge.phone),
      "Failed to load user by phone",
    );
    if (Result.isError(existingUserResult)) {
      return Result.err(existingUserResult.error);
    }
    if (existingUserResult.value !== undefined) {
      return Result.err(conflict("Phone already exist"));
    }

    const hashResult = await createPasswordHash(payload.password);
    if (Result.isError(hashResult)) {
      return Result.err(hashResult.error);
    }

    return await finalizeRegistration(
      {
        name: payload.name,
        email: null,
        phone: challenge.phone,
        passwordHash: hashResult.value,
      },
      auth,
      session,
      {
        sendEmailVerification: false,
        challengeIdToInvalidate: challenge.id,
      },
    );
  },

  async startPhoneLink(
    userId: bigint,
    payload: LinkPhoneStartInput,
    requestMeta: { ipAddress: string; sessionId: string | null },
  ): Promise<
    AppResult<{
      status: "success";
      challengeId: string;
      expiresAt: string;
      resendAvailableAt: string;
    }>
  > {
    const gateResult = assertPhoneAuthEnabled();
    if (gateResult !== undefined) {
      return gateResult;
    }

    if (requestMeta.sessionId === null) {
      return Result.err(badRequest("Phone linking requires an active session"));
    }

    const reauthResult = await requireCurrentPasswordReauth(
      userId,
      payload.currentPassword,
    );
    if (Result.isError(reauthResult)) {
      return Result.err(reauthResult.error);
    }

    const user = reauthResult.value;
    if (user.phone !== null && user.phone !== "") {
      return Result.err(badRequest("Phone is already linked to this account"));
    }

    const normalizedPhoneResult = normalizePhone(
      payload.phone,
      payload.defaultCountry,
    );
    if (Result.isError(normalizedPhoneResult)) {
      return Result.err(normalizedPhoneResult.error);
    }

    const phone = normalizedPhoneResult.value;

    const ipThrottle = await tryInternal(
      () =>
        consumeAuthThrottle({
          scope: "link_phone_ip",
          key: requestMeta.ipAddress,
          limit: authConfig.smsMaxSendsPerIpPerHour,
          windowSeconds: 60 * 60,
        }),
      "Failed to enforce phone linking IP throttle",
    );
    if (Result.isError(ipThrottle)) {
      return Result.err(ipThrottle.error);
    }
    if (!ipThrottle.value.allowed) {
      return Result.err(
        badRequest("Too many verification attempts. Please try again later."),
      );
    }

    const phoneThrottle = await tryInternal(
      () =>
        consumeAuthThrottle({
          scope: PHONE_SMS_SEND_THROTTLE_SCOPE,
          key: phone,
          limit: authConfig.smsMaxSendsPerPhonePerHour,
          windowSeconds: 60 * 60,
        }),
      "Failed to enforce phone linking identifier throttle",
    );
    if (Result.isError(phoneThrottle)) {
      return Result.err(phoneThrottle.error);
    }
    if (!phoneThrottle.value.allowed) {
      return Result.err(
        badRequest("Too many verification attempts. Please try again later."),
      );
    }

    const phoneExistsResult = await tryInternal(
      () => userRepository.phoneExistsForOtherUser(phone, userId),
      "Failed to validate phone ownership",
    );
    if (Result.isError(phoneExistsResult)) {
      return Result.err(phoneExistsResult.error);
    }
    if (phoneExistsResult.value) {
      return Result.err(conflict("Phone is already linked to another account"));
    }

    const pendingChallengeResult = await tryInternal(
      () =>
        smsAuthChallengeRepository.findLatestPendingForPhoneFlow(
          phone,
          LINK_PHONE_FLOW,
        ),
      "Failed to load pending phone linking challenge",
    );
    if (Result.isError(pendingChallengeResult)) {
      return Result.err(pendingChallengeResult.error);
    }
    if (
      pendingChallengeResult.value !== undefined &&
      pendingChallengeResult.value.resendAvailableAt.getTime() > Date.now()
    ) {
      return Result.err(
        buildResendCooldownError(
          pendingChallengeResult.value.resendAvailableAt,
        ),
      );
    }

    await smsAuthChallengeRepository.invalidatePendingForPhoneFlow(
      phone,
      LINK_PHONE_FLOW,
    );

    const now = Date.now();
    const expiresAt = new Date(now + authConfig.smsChallengeTtlSeconds * 1000);
    const resendAvailableAt = new Date(
      now + authConfig.smsResendCooldownSeconds * 1000,
    );

    const createdResult = await tryInternal(
      () =>
        smsAuthChallengeRepository.create({
          flow: LINK_PHONE_FLOW,
          phone,
          codeHash: PENDING_SMS_CODE_HASH_PLACEHOLDER,
          expiresAt,
          resendAvailableAt,
          providerRequestId: null,
          metadata: {
            userId: String(userId),
            ipAddress: requestMeta.ipAddress,
            provider: authConfig.smsProvider,
            sessionId: requestMeta.sessionId,
          },
        }),
      "Failed to persist phone linking challenge",
    );
    if (Result.isError(createdResult)) {
      return Result.err(createdResult.error);
    }

    const issueCodeResult = await tryInternal(
      () =>
        smsVerificationProvider.issueVerificationCode({
          phone,
          flow: LINK_PHONE_FLOW,
        }),
      "Failed to issue SMS verification code",
    );
    if (Result.isError(issueCodeResult)) {
      await smsAuthChallengeRepository.markInvalidated(createdResult.value.id);
      return Result.err(issueCodeResult.error);
    }

    const issuedChallengeResult = await tryInternal(
      () =>
        smsAuthChallengeRepository.markIssued(createdResult.value.id, {
          codeHash: hashOtpVerificationCode(issueCodeResult.value.code),
          providerRequestId: issueCodeResult.value.providerRequestId,
          metadata: {
            userId: String(userId),
            ipAddress: requestMeta.ipAddress,
            provider: authConfig.smsProvider,
            sessionId: requestMeta.sessionId,
          },
        }),
      "Failed to persist issued phone linking challenge",
    );
    if (Result.isError(issuedChallengeResult)) {
      await smsAuthChallengeRepository.markInvalidated(createdResult.value.id);
      return Result.err(issuedChallengeResult.error);
    }
    if (issuedChallengeResult.value === undefined) {
      await smsAuthChallengeRepository.markInvalidated(createdResult.value.id);
      return Result.err(
        badRequest("Phone linking challenge is no longer valid"),
      );
    }

    return Result.ok({
      status: "success",
      challengeId: issuedChallengeResult.value.id,
      expiresAt: issuedChallengeResult.value.expiresAt.toISOString(),
      resendAvailableAt:
        issuedChallengeResult.value.resendAvailableAt.toISOString(),
    });
  },

  async confirmPhoneLink(
    userId: bigint,
    payload: LinkPhoneConfirmInput,
    requestMeta: { ipAddress: string; sessionId: string | null },
  ): Promise<
    AppResult<{
      status: "success";
      message: string;
      user: ReturnType<typeof userTransformer.serialize>;
    }>
  > {
    const gateResult = assertPhoneAuthEnabled();
    if (gateResult !== undefined) {
      return gateResult;
    }

    const ipThrottle = await tryInternal(
      () =>
        consumeAuthThrottle({
          scope: "confirm_link_phone_ip",
          key: requestMeta.ipAddress,
          limit: authConfig.smsMaxConfirmAttemptsPerIpPerHour,
          windowSeconds: 60 * 60,
        }),
      "Failed to enforce phone linking confirmation IP throttle",
    );
    if (Result.isError(ipThrottle)) {
      return Result.err(ipThrottle.error);
    }
    if (!ipThrottle.value.allowed) {
      return Result.err(
        badRequest("Too many verification attempts. Please try again later."),
      );
    }

    const challengeResult = await tryInternal(
      () => smsAuthChallengeRepository.findById(payload.challengeId),
      "Failed to load SMS auth challenge",
    );
    if (Result.isError(challengeResult)) {
      return Result.err(challengeResult.error);
    }

    const challenge = challengeResult.value;
    if (challenge === undefined || challenge.flow !== LINK_PHONE_FLOW) {
      return Result.err(
        notFound("Challenge", "Phone linking challenge not found"),
      );
    }

    const challengeUserId = extractChallengeUserId(challenge.metadata);
    if (challengeUserId !== userId) {
      return Result.err(
        unauthorized("Challenge does not belong to this account"),
      );
    }

    const challengeSessionId = extractChallengeSessionId(challenge.metadata);
    if (
      challengeSessionId === null ||
      requestMeta.sessionId === null ||
      challengeSessionId !== requestMeta.sessionId
    ) {
      return Result.err(
        badRequest(
          "Phone linking challenge must be confirmed from the same session",
        ),
      );
    }

    if (
      challenge.invalidatedAt !== null ||
      challenge.confirmedAt !== null ||
      isChallengeExpired(challenge.expiresAt)
    ) {
      return Result.err(
        badRequest("Phone linking challenge is no longer valid"),
      );
    }

    if (!verifyOtpVerificationCode(payload.code, challenge.codeHash)) {
      const updatedChallenge =
        await smsAuthChallengeRepository.incrementAttemptCount(challenge.id);
      if (
        (updatedChallenge?.attemptCount ?? challenge.attemptCount + 1) >=
        authConfig.smsMaxInvalidAttempts
      ) {
        await smsAuthChallengeRepository.markInvalidated(challenge.id);
      }

      return Result.err(badRequest("Invalid verification code"));
    }

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
    if (user.phone !== null && user.phone !== "") {
      return Result.err(badRequest("Phone is already linked to this account"));
    }

    const phoneExistsResult = await tryInternal(
      () => userRepository.phoneExistsForOtherUser(challenge.phone, userId),
      "Failed to validate phone ownership",
    );
    if (Result.isError(phoneExistsResult)) {
      return Result.err(phoneExistsResult.error);
    }
    if (phoneExistsResult.value) {
      return Result.err(conflict("Phone is already linked to another account"));
    }

    const confirmedResult = await tryInternal(
      () => smsAuthChallengeRepository.markConfirmed(challenge.id),
      "Failed to confirm phone linking challenge",
    );
    if (Result.isError(confirmedResult)) {
      return Result.err(confirmedResult.error);
    }
    if (confirmedResult.value === undefined) {
      return Result.err(
        badRequest("Phone linking challenge is no longer valid"),
      );
    }

    const updatedUserResult = await tryInternal(
      () => userRepository.update(userId, { phone: challenge.phone }),
      "Failed to link phone to user account",
    );
    if (Result.isError(updatedUserResult)) {
      return Result.err(updatedUserResult.error);
    }

    const updatedUser = updatedUserResult.value;
    if (updatedUser === undefined) {
      return Result.err(
        internalMessage("Failed to link phone to user account"),
      );
    }

    return Result.ok({
      status: "success",
      message: "Phone linked successfully",
      user: userTransformer.serialize(updatedUser),
    });
  },

  async startEmailLink(
    userId: bigint,
    payload: LinkEmailStartInput,
  ): Promise<AppResult<{ status: "success"; message: string }>> {
    const reauthResult = await requireCurrentPasswordReauth(
      userId,
      payload.currentPassword,
    );
    if (Result.isError(reauthResult)) {
      return Result.err(reauthResult.error);
    }

    const user = reauthResult.value;
    if (user.email !== null && user.email !== "") {
      return Result.err(badRequest("Email is already linked to this account"));
    }

    const email = normalizeEmail(payload.email);

    const targetThrottle = await tryInternal(
      () =>
        consumeAuthThrottle({
          scope: "link_email_target",
          key: email,
          limit: authConfig.emailLinkMaxAttemptsPerTargetPerHour,
          windowSeconds: 60 * 60,
        }),
      "Failed to enforce email linking target throttle",
    );
    if (Result.isError(targetThrottle)) {
      return Result.err(targetThrottle.error);
    }
    if (!targetThrottle.value.allowed) {
      return Result.err(
        badRequest("Too many verification attempts. Please try again later."),
      );
    }

    const userThrottle = await tryInternal(
      () =>
        consumeAuthThrottle({
          scope: "link_email_user",
          key: String(userId),
          limit: authConfig.emailLinkMaxAttemptsPerUserPerHour,
          windowSeconds: 60 * 60,
        }),
      "Failed to enforce email linking user throttle",
    );
    if (Result.isError(userThrottle)) {
      return Result.err(userThrottle.error);
    }
    if (!userThrottle.value.allowed) {
      return Result.err(
        badRequest("Too many verification attempts. Please try again later."),
      );
    }

    const userCooldown = await tryInternal(
      () =>
        consumeAuthThrottle({
          scope: "link_email_user_cooldown",
          key: String(userId),
          limit: 1,
          windowSeconds: authConfig.emailLinkCooldownSeconds,
        }),
      "Failed to enforce email linking cooldown",
    );
    if (Result.isError(userCooldown)) {
      return Result.err(userCooldown.error);
    }
    if (!userCooldown.value.allowed) {
      return Result.err(
        badRequest("Too many verification attempts. Please try again later."),
      );
    }

    const emailExistsResult = await tryInternal(
      () => userRepository.emailExistsForOtherUser(email, userId),
      "Failed to validate email ownership",
    );
    if (Result.isError(emailExistsResult)) {
      return Result.err(emailExistsResult.error);
    }
    if (emailExistsResult.value) {
      return Result.err(conflict("Email is already linked to another account"));
    }

    const sendResult = await emailVerificationService.sendLinkVerificationEmail(
      userId,
      email,
    );
    if (Result.isError(sendResult)) {
      return Result.err(sendResult.error);
    }

    return Result.ok({
      status: "success",
      message: sendResult.value.message,
    });
  },

  async login(
    payload: LoginInput,
    auth: Auth,
    session: Session,
  ): Promise<AppResult<AuthSuccessPayload>> {
    const { password } = payload;
    const identifier = resolveLoginIdentifier(payload).trim();
    const isEmailIdentifier = identifier.includes("@");

    let userResult;
    if (isEmailIdentifier) {
      userResult = await tryInternal(
        () => userRepository.findByEmail(normalizeEmail(identifier)),
        "Failed to load user by email",
      );
    } else if (looksLikePhoneNumber(identifier)) {
      const gateResult = assertPhoneAuthEnabled();
      if (gateResult !== undefined) {
        return Result.err(unauthorized("Invalid email or password"));
      }

      const normalizedPhoneResult = normalizePhone(identifier);
      if (Result.isError(normalizedPhoneResult)) {
        return Result.err(unauthorized("Invalid email or password"));
      }

      userResult = await tryInternal(
        () => userRepository.findByPhone(normalizedPhoneResult.value),
        "Failed to load user by phone",
      );
    } else {
      return Result.err(unauthorized("Invalid email or password"));
    }

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

    const validResult = await tryInternal(
      () => validatePassword(password, user.password!),
      "Failed to validate password",
    );
    if (Result.isError(validResult)) {
      return Result.err(validResult.error);
    }

    if (!validResult.value) {
      return Result.err(unauthorized("Invalid email or password"));
    }

    if (
      isEmailIdentifier &&
      authConfig.strictRegistration &&
      user.emailVerifiedAt === null
    ) {
      return Result.err(badRequest("Email verification required"));
    }

    return await buildAuthSuccess(user, auth, session);
  },

  async logout(
    auth: Auth,
    session: Session,
  ): Promise<AppResult<{ status: "success"; csrfToken: string }>> {
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

    const csrfToken = getSessionCsrfToken(session.sessionInfo);
    if (csrfToken === undefined) {
      return Result.err(internalMessage("Missing rotated CSRF token"));
    }

    return Result.ok({
      status: "success",
      csrfToken,
    });
  },

  async logoutAll(
    auth: Auth,
    session: Session,
  ): Promise<
    AppResult<{ status: "success"; deletedCount: number; csrfToken: string }>
  > {
    const result = await tryInternal(
      () => auth.logoutAll(),
      "Failed to log out all sessions",
    );
    if (Result.isError(result)) {
      return Result.err(result.error);
    }

    const csrfToken = getSessionCsrfToken(session.sessionInfo);
    if (csrfToken === undefined) {
      return Result.err(internalMessage("Missing rotated CSRF token"));
    }

    return Result.ok({
      status: "success",
      deletedCount: result.value,
      csrfToken,
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

      if (!validResult.value) {
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

    if (updatedResult.value === undefined) {
      return Result.err(internalMessage("Failed to update password"));
    }

    return Result.ok({ status: "success" });
  },
};
