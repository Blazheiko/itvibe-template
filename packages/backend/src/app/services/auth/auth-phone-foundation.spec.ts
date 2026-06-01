import { Result } from "better-result";
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const userRepositoryMock = {
  findByEmail: vi.fn(),
  findByPhone: vi.fn(),
  findById: vi.fn(),
  phoneExistsForOtherUser: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

const smsAuthChallengeRepositoryMock = {
  invalidatePendingForPhoneFlow: vi.fn(),
  findLatestPendingForPhoneFlow: vi.fn(),
  create: vi.fn(),
  markIssued: vi.fn(),
  findById: vi.fn(),
  incrementAttemptCount: vi.fn(),
  markConfirmed: vi.fn(),
  markInvalidated: vi.fn(),
};

const authMock = {
  login: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
};

const sessionMock = {
  sessionInfo: {
    id: "session-id",
    data: {},
  },
  destroySession: vi.fn(),
};

const loggerMock = {
  warn: vi.fn(),
  info: vi.fn(),
};

const hashPasswordMock = vi.fn();
const validatePasswordMock = vi.fn();
const generateWsTokenMock = vi.fn();
const consumeAuthThrottleMock = vi.fn();
const issueVerificationCodeMock = vi.fn();

vi.mock("#app/repositories/index.js", () => ({
  userRepository: userRepositoryMock,
  smsAuthChallengeRepository: smsAuthChallengeRepositoryMock,
}));

vi.mock("#app/transformers/index.js", () => ({
  userTransformer: {
    serialize: vi.fn(
      (user: {
        id: bigint;
        email: string | null;
        phone?: string | null;
        name?: string | null;
      }) => ({
        id: String(user.id),
        email: user.email,
        phone: user.phone ?? null,
        name: user.name ?? "",
      }),
    ),
  },
}));

vi.mock("metautil", () => ({
  hashPassword: hashPasswordMock,
  validatePassword: validatePasswordMock,
}));

vi.mock("#app/services/auth/generate-ws-token-service.js", () => ({
  generateWsToken: generateWsTokenMock,
}));

vi.mock("#app/services/communication/get-ws-url-service.js", () => ({
  getWsUrl: vi.fn(() => "wss://example.com/ws"),
}));

vi.mock("#app/services/auth/email-verification-service.js", () => ({
  emailVerificationService: {
    sendVerificationEmailAfterRegistration: vi.fn(),
    sendLinkVerificationEmail: vi.fn(),
  },
}));

vi.mock("#app/services/auth/auth-throttle-service.js", () => ({
  consumeAuthThrottle: consumeAuthThrottleMock,
}));

vi.mock("#app/services/auth/sms-verification-provider.js", () => ({
  smsVerificationProvider: {
    issueVerificationCode: issueVerificationCodeMock,
  },
  fakeSmsVerificationProvider: {
    reset: vi.fn(),
    latestForPhone: vi.fn(),
  },
}));

async function loadAuthService() {
  return import("./auth-service.js");
}

function hashOtp(code: string): string {
  return createHmac("sha256", "a".repeat(32)).update(code).digest("hex");
}

beforeEach(() => {
  process.env["APP_KEY"] = "a".repeat(32);
  process.env["AUTH_PHONE_ENABLED"] = "true";
  process.env["AUTH_SMS_PROVIDER"] = "fake";
});

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  sessionMock.sessionInfo = {
    id: "session-id",
    data: {},
  };
  process.env["APP_KEY"] = "a".repeat(32);
  process.env["AUTH_PHONE_ENABLED"] = "true";
  process.env["AUTH_SMS_PROVIDER"] = "fake";
});

describe("authService phone foundation", () => {
  it("logs in with a phone identifier when phone auth is enabled", async () => {
    userRepositoryMock.findByPhone.mockResolvedValue({
      id: 7n,
      email: null,
      phone: "+14155550123",
      name: "Jane",
      password: "hashed-password",
      sessionToken: "session-token",
    });
    validatePasswordMock.mockResolvedValue(true);
    authMock.login.mockResolvedValue(true);
    generateWsTokenMock.mockResolvedValue("ws-token");

    const { authService } = await loadAuthService();
    const result = await authService.login(
      {
        identifier: "+1 415 555 0123",
        password: "secret123",
        token: "",
      },
      authMock as any,
      sessionMock as any,
    );

    expect(userRepositoryMock.findByPhone).toHaveBeenCalledWith("+14155550123");
    expect(validatePasswordMock).toHaveBeenCalledWith(
      "secret123",
      "hashed-password",
    );
    expect(Result.isOk(result)).toBe(true);
  });

  it("starts phone registration without storing a pre-account password hash", async () => {
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
    userRepositoryMock.findByPhone.mockResolvedValue(undefined);
    smsAuthChallengeRepositoryMock.findLatestPendingForPhoneFlow.mockResolvedValue(
      undefined,
    );
    smsAuthChallengeRepositoryMock.invalidatePendingForPhoneFlow.mockResolvedValue(
      0,
    );
    smsAuthChallengeRepositoryMock.create.mockResolvedValue({
      id: "challenge-1",
      flow: "register_phone",
      phone: "+14155550123",
      codeHash: "PENDING_SMS_CODE_HASH_PLACEHOLDER",
      providerRequestId: null,
      metadata: {
        ipAddress: "127.0.0.1",
        provider: "fake",
        sessionId: "session-id",
      },
      attemptCount: 0,
      sendCount: 1,
      resendAvailableAt: new Date("2099-05-15T10:01:00.000Z"),
      expiresAt: new Date("2099-05-15T10:10:00.000Z"),
      confirmedAt: null,
      invalidatedAt: null,
      createdAt: new Date("2026-05-15T10:00:00.000Z"),
      updatedAt: new Date("2026-05-15T10:00:00.000Z"),
    });
    issueVerificationCodeMock.mockResolvedValue({
      code: "123456",
      providerRequestId: "fake-1",
    });
    smsAuthChallengeRepositoryMock.markIssued.mockResolvedValue({
      id: "challenge-1",
      flow: "register_phone",
      phone: "+14155550123",
      codeHash: "hashed-code",
      providerRequestId: "fake-1",
      metadata: {
        ipAddress: "127.0.0.1",
        provider: "fake",
        sessionId: "session-id",
      },
      attemptCount: 0,
      sendCount: 1,
      resendAvailableAt: new Date("2099-05-15T10:01:00.000Z"),
      expiresAt: new Date("2099-05-15T10:10:00.000Z"),
      confirmedAt: null,
      invalidatedAt: null,
      createdAt: new Date("2026-05-15T10:00:00.000Z"),
      updatedAt: new Date("2026-05-15T10:00:01.000Z"),
    });

    const { authService } = await loadAuthService();
    const result = await authService.startPhoneRegistration(
      {
        phone: "+1 415 555 0123",
      },
      { ipAddress: "127.0.0.1", sessionId: "session-id" },
    );

    expect(Result.isOk(result)).toBe(true);
    expect(smsAuthChallengeRepositoryMock.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ password: expect.anything() }),
    );
    expect(smsAuthChallengeRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        flow: "register_phone",
        phone: "+14155550123",
      }),
    );
    const invalidateCallOrder =
      smsAuthChallengeRepositoryMock.invalidatePendingForPhoneFlow.mock
        .invocationCallOrder[0];
    const createCallOrder =
      smsAuthChallengeRepositoryMock.create.mock.invocationCallOrder[0];
    const issueCodeCallOrder =
      issueVerificationCodeMock.mock.invocationCallOrder[0];

    expect(invalidateCallOrder).toBeDefined();
    expect(createCallOrder).toBeDefined();
    expect(issueCodeCallOrder).toBeDefined();
    expect(invalidateCallOrder!).toBeLessThan(createCallOrder!);
    expect(createCallOrder!).toBeLessThan(issueCodeCallOrder!);
    expect(smsAuthChallengeRepositoryMock.markIssued).toHaveBeenCalledWith(
      "challenge-1",
      expect.objectContaining({
        providerRequestId: "fake-1",
        metadata: {
          ipAddress: "127.0.0.1",
          provider: "fake",
          sessionId: "session-id",
        },
      }),
    );
  });

  it("fails phone registration start when challenge expires before markIssued", async () => {
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
    userRepositoryMock.findByPhone.mockResolvedValue(undefined);
    smsAuthChallengeRepositoryMock.findLatestPendingForPhoneFlow.mockResolvedValue(
      undefined,
    );
    smsAuthChallengeRepositoryMock.invalidatePendingForPhoneFlow.mockResolvedValue(
      0,
    );
    smsAuthChallengeRepositoryMock.create.mockResolvedValue({
      id: "challenge-1",
      flow: "register_phone",
      phone: "+14155550123",
      codeHash: "PENDING_SMS_CODE_HASH_PLACEHOLDER",
      providerRequestId: null,
      metadata: {
        ipAddress: "127.0.0.1",
        provider: "fake",
        sessionId: "session-id",
      },
      attemptCount: 0,
      sendCount: 1,
      resendAvailableAt: new Date("2099-05-15T10:01:00.000Z"),
      expiresAt: new Date("2099-05-15T10:10:00.000Z"),
      confirmedAt: null,
      invalidatedAt: null,
      createdAt: new Date("2026-05-15T10:00:00.000Z"),
      updatedAt: new Date("2026-05-15T10:00:00.000Z"),
    });
    issueVerificationCodeMock.mockResolvedValue({
      code: "123456",
      providerRequestId: "fake-1",
    });
    smsAuthChallengeRepositoryMock.markIssued.mockResolvedValue(undefined);
    smsAuthChallengeRepositoryMock.markInvalidated.mockResolvedValue({
      id: "challenge-1",
    });

    const { authService } = await loadAuthService();
    const result = await authService.startPhoneRegistration(
      {
        phone: "+1 415 555 0123",
      },
      { ipAddress: "127.0.0.1", sessionId: "session-id" },
    );

    expect(Result.isError(result)).toBe(true);
    expect(smsAuthChallengeRepositoryMock.markInvalidated).toHaveBeenCalledWith(
      "challenge-1",
    );
  });

  it("keeps phone registration start outwardly generic when the phone already exists", async () => {
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
    userRepositoryMock.findByPhone.mockResolvedValue({
      id: 11n,
      email: null,
      phone: "+14155550123",
      name: "Existing User",
      password: "hashed-password",
      sessionToken: "existing-session",
    });
    smsAuthChallengeRepositoryMock.findLatestPendingForPhoneFlow.mockResolvedValue(
      undefined,
    );
    smsAuthChallengeRepositoryMock.invalidatePendingForPhoneFlow.mockResolvedValue(
      1,
    );
    smsAuthChallengeRepositoryMock.create.mockResolvedValue({
      id: "challenge-existing",
      flow: "register_phone",
      phone: "+14155550123",
      codeHash: "PENDING_SMS_CODE_HASH_PLACEHOLDER",
      providerRequestId: null,
      metadata: {
        ipAddress: "127.0.0.1",
        provider: "fake",
        sessionId: "session-id",
      },
      attemptCount: 0,
      sendCount: 1,
      resendAvailableAt: new Date("2099-05-15T10:01:00.000Z"),
      expiresAt: new Date("2099-05-15T10:10:00.000Z"),
      confirmedAt: null,
      invalidatedAt: null,
      createdAt: new Date("2026-05-15T10:00:00.000Z"),
      updatedAt: new Date("2026-05-15T10:00:00.000Z"),
    });
    issueVerificationCodeMock.mockResolvedValue({
      code: "123456",
      providerRequestId: "fake-2",
    });
    smsAuthChallengeRepositoryMock.markIssued.mockResolvedValue({
      id: "challenge-existing",
      flow: "register_phone",
      phone: "+14155550123",
      codeHash: "hashed-code",
      providerRequestId: "fake-2",
      metadata: {
        ipAddress: "127.0.0.1",
        provider: "fake",
        sessionId: "session-id",
      },
      attemptCount: 0,
      sendCount: 1,
      resendAvailableAt: new Date("2099-05-15T10:01:00.000Z"),
      expiresAt: new Date("2099-05-15T10:10:00.000Z"),
      confirmedAt: null,
      invalidatedAt: null,
      createdAt: new Date("2026-05-15T10:00:00.000Z"),
      updatedAt: new Date("2026-05-15T10:00:01.000Z"),
    });

    const { authService } = await loadAuthService();
    const result = await authService.startPhoneRegistration(
      {
        phone: "+1 415 555 0123",
      },
      { ipAddress: "127.0.0.1", sessionId: "session-id" },
    );

    expect(Result.isOk(result)).toBe(true);
    expect(issueVerificationCodeMock).toHaveBeenCalledWith({
      phone: "+14155550123",
      flow: "register_phone",
    });
    expect(smsAuthChallengeRepositoryMock.markIssued).toHaveBeenCalledWith(
      "challenge-existing",
      expect.objectContaining({
        metadata: expect.objectContaining({
          ipAddress: "127.0.0.1",
          provider: "fake",
          sessionId: "session-id",
        }),
      }),
    );
  });

  it("throttles phone registration confirmation attempts by IP address", async () => {
    consumeAuthThrottleMock.mockResolvedValue({ allowed: false, count: 21 });

    const { authService } = await loadAuthService();
    const result = await authService.confirmPhoneRegistration(
      {
        challengeId: "challenge-1",
        code: "000000",
      },
      { ipAddress: "127.0.0.1" },
    );

    expect(Result.isError(result)).toBe(true);
    expect(smsAuthChallengeRepositoryMock.findById).not.toHaveBeenCalled();
    expect(consumeAuthThrottleMock).toHaveBeenCalledWith({
      scope: "confirm_phone_ip",
      key: "127.0.0.1",
      limit: 20,
      windowSeconds: 60 * 60,
    });
  });

  it("invalidates a phone registration challenge after the fifth wrong code attempt", async () => {
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
    smsAuthChallengeRepositoryMock.findById.mockResolvedValue({
      id: "challenge-1",
      flow: "register_phone",
      phone: "+14155550123",
      codeHash: "hashed-code",
      providerRequestId: "fake-1",
      metadata: { sessionId: "session-id" },
      attemptCount: 4,
      sendCount: 1,
      resendAvailableAt: new Date("2099-05-15T10:01:00.000Z"),
      expiresAt: new Date("2099-05-15T10:10:00.000Z"),
      confirmedAt: null,
      invalidatedAt: null,
      createdAt: new Date("2026-05-15T10:00:00.000Z"),
      updatedAt: new Date("2026-05-15T10:00:00.000Z"),
    });
    smsAuthChallengeRepositoryMock.incrementAttemptCount.mockResolvedValue({
      attemptCount: 5,
    });
    smsAuthChallengeRepositoryMock.markInvalidated.mockResolvedValue({
      id: "challenge-1",
    });

    const { authService } = await loadAuthService();
    const result = await authService.confirmPhoneRegistration(
      {
        challengeId: "challenge-1",
        code: "000000",
      },
      { ipAddress: "127.0.0.1" },
    );

    expect(Result.isError(result)).toBe(true);
    expect(
      smsAuthChallengeRepositoryMock.incrementAttemptCount,
    ).toHaveBeenCalledWith("challenge-1");
    expect(smsAuthChallengeRepositoryMock.markInvalidated).toHaveBeenCalledWith(
      "challenge-1",
    );
  });

  it("completes phone registration after confirmation and creates a phone-only user", async () => {
    smsAuthChallengeRepositoryMock.findById.mockResolvedValue({
      id: "challenge-1",
      flow: "register_phone",
      phone: "+14155550123",
      codeHash: "hashed-code",
      providerRequestId: "fake-1",
      metadata: { sessionId: "session-id" },
      attemptCount: 0,
      sendCount: 1,
      resendAvailableAt: new Date("2099-05-15T10:01:00.000Z"),
      expiresAt: new Date("2099-05-15T10:10:00.000Z"),
      confirmedAt: new Date("2026-05-15T10:00:30.000Z"),
      invalidatedAt: null,
      createdAt: new Date("2026-05-15T10:00:00.000Z"),
      updatedAt: new Date("2026-05-15T10:00:30.000Z"),
    });
    userRepositoryMock.findByPhone.mockResolvedValue(undefined);
    hashPasswordMock.mockResolvedValue("hashed-password");
    userRepositoryMock.create.mockResolvedValue({
      id: 9n,
      email: null,
      phone: "+14155550123",
      name: "Phone User",
      sessionToken: "session-token",
    });
    smsAuthChallengeRepositoryMock.markInvalidated.mockResolvedValue({
      id: "challenge-1",
    });
    sessionMock.destroySession.mockResolvedValue(undefined);
    authMock.login.mockResolvedValue(true);
    generateWsTokenMock.mockResolvedValue("ws-token");

    const { authService } = await loadAuthService();
    const result = await authService.completePhoneRegistration(
      {
        challengeId: "challenge-1",
        name: "Phone User",
        password: "secret123",
        token: "",
      },
      authMock as any,
      sessionMock as any,
      loggerMock as any,
      { sessionId: "session-id" },
    );

    expect(hashPasswordMock).toHaveBeenCalledWith("secret123");
    expect(userRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: null,
        phone: "+14155550123",
        password: "hashed-password",
      }),
    );
    expect(Result.isOk(result)).toBe(true);
  });

  it("rejects completePhoneRegistration when the challenge session does not match", async () => {
    smsAuthChallengeRepositoryMock.findById.mockResolvedValue({
      id: "challenge-1",
      flow: "register_phone",
      phone: "+14155550123",
      codeHash: "hashed-code",
      providerRequestId: "fake-1",
      metadata: { sessionId: "another-session" },
      attemptCount: 0,
      sendCount: 1,
      resendAvailableAt: new Date("2099-05-15T10:01:00.000Z"),
      expiresAt: new Date("2099-05-15T10:10:00.000Z"),
      confirmedAt: new Date("2026-05-15T10:00:30.000Z"),
      invalidatedAt: null,
      createdAt: new Date("2026-05-15T10:00:00.000Z"),
      updatedAt: new Date("2026-05-15T10:00:30.000Z"),
    });

    const { authService } = await loadAuthService();
    const result = await authService.completePhoneRegistration(
      {
        challengeId: "challenge-1",
        name: "Phone User",
        password: "secret123",
        token: "",
      },
      authMock as any,
      sessionMock as any,
      loggerMock as any,
      { sessionId: "session-id" },
    );

    expect(Result.isError(result)).toBe(true);
    expect(userRepositoryMock.findByPhone).not.toHaveBeenCalled();
  });

  it("starts a phone linking challenge after re-authentication", async () => {
    userRepositoryMock.findById.mockResolvedValue({
      id: 7n,
      email: "user@example.com",
      phone: null,
      password: "hashed-password",
      sessionToken: "session-token",
    });
    validatePasswordMock.mockResolvedValue(true);
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
    userRepositoryMock.phoneExistsForOtherUser.mockResolvedValue(false);
    smsAuthChallengeRepositoryMock.findLatestPendingForPhoneFlow.mockResolvedValue(
      undefined,
    );
    smsAuthChallengeRepositoryMock.invalidatePendingForPhoneFlow.mockResolvedValue(
      0,
    );
    smsAuthChallengeRepositoryMock.create.mockResolvedValue({
      id: "link-challenge-1",
      flow: "link_phone",
      phone: "+14155550123",
      codeHash: "PENDING_SMS_CODE_HASH_PLACEHOLDER",
      providerRequestId: null,
      metadata: {
        userId: "7",
        ipAddress: "127.0.0.1",
        provider: "fake",
        sessionId: "session-id",
      },
      attemptCount: 0,
      sendCount: 1,
      resendAvailableAt: new Date("2099-05-15T10:01:00.000Z"),
      expiresAt: new Date("2099-05-15T10:10:00.000Z"),
      confirmedAt: null,
      invalidatedAt: null,
      createdAt: new Date("2026-05-15T10:00:00.000Z"),
      updatedAt: new Date("2026-05-15T10:00:00.000Z"),
    });
    issueVerificationCodeMock.mockResolvedValue({
      code: "123456",
      providerRequestId: "fake-link-1",
    });
    smsAuthChallengeRepositoryMock.markIssued.mockResolvedValue({
      id: "link-challenge-1",
      flow: "link_phone",
      phone: "+14155550123",
      codeHash: "hashed-code",
      providerRequestId: "fake-link-1",
      metadata: {
        userId: "7",
        ipAddress: "127.0.0.1",
        provider: "fake",
        sessionId: "session-id",
      },
      attemptCount: 0,
      sendCount: 1,
      resendAvailableAt: new Date("2099-05-15T10:01:00.000Z"),
      expiresAt: new Date("2099-05-15T10:10:00.000Z"),
      confirmedAt: null,
      invalidatedAt: null,
      createdAt: new Date("2026-05-15T10:00:00.000Z"),
      updatedAt: new Date("2026-05-15T10:00:01.000Z"),
    });

    const { authService } = await loadAuthService();
    const result = await authService.startPhoneLink(
      7n,
      {
        phone: "+1 415 555 0123",
        currentPassword: "secret123",
      },
      { ipAddress: "127.0.0.1", sessionId: "session-id" },
    );

    expect(Result.isOk(result)).toBe(true);
    expect(userRepositoryMock.phoneExistsForOtherUser).toHaveBeenCalledWith(
      "+14155550123",
      7n,
    );
    expect(issueVerificationCodeMock).toHaveBeenCalledWith({
      phone: "+14155550123",
      flow: "link_phone",
    });
  });

  it("requires an active session to start phone linking", async () => {
    const { authService } = await loadAuthService();
    const result = await authService.startPhoneLink(
      7n,
      {
        phone: "+1 415 555 0123",
        currentPassword: "secret123",
      },
      { ipAddress: "127.0.0.1", sessionId: null },
    );

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "BadRequest",
        message: "Phone linking requires an active session",
      });
    }
    expect(userRepositoryMock.findById).not.toHaveBeenCalled();
  });

  it("enforces resend cooldown for phone registration on the server", async () => {
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
    userRepositoryMock.findByPhone.mockResolvedValue(undefined);
    smsAuthChallengeRepositoryMock.findLatestPendingForPhoneFlow.mockResolvedValue(
      {
        id: "challenge-pending",
        flow: "register_phone",
        phone: "+14155550123",
        codeHash: "hashed-code",
        providerRequestId: "fake-1",
        metadata: { sessionId: "session-id" },
        attemptCount: 0,
        sendCount: 1,
        resendAvailableAt: new Date(Date.now() + 45_000),
        expiresAt: new Date(Date.now() + 10 * 60_000),
        confirmedAt: null,
        invalidatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    const { authService } = await loadAuthService();
    const result = await authService.startPhoneRegistration(
      {
        phone: "+1 415 555 0123",
      },
      { ipAddress: "127.0.0.1", sessionId: "session-id" },
    );

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error._tag).toBe("RateLimited");
    }
    expect(
      smsAuthChallengeRepositoryMock.invalidatePendingForPhoneFlow,
    ).not.toHaveBeenCalled();
    expect(issueVerificationCodeMock).not.toHaveBeenCalled();
  });

  it("throttles phone linking confirmation attempts by IP address", async () => {
    consumeAuthThrottleMock.mockResolvedValue({ allowed: false, count: 21 });

    const { authService } = await loadAuthService();
    const result = await authService.confirmPhoneLink(
      7n,
      {
        challengeId: "link-challenge-1",
        code: "123456",
      },
      {
        ipAddress: "127.0.0.1",
        sessionId: "session-id",
      },
    );

    expect(Result.isError(result)).toBe(true);
    expect(smsAuthChallengeRepositoryMock.findById).not.toHaveBeenCalled();
    expect(consumeAuthThrottleMock).toHaveBeenCalledWith({
      scope: "confirm_link_phone_ip",
      key: "127.0.0.1",
      limit: 20,
      windowSeconds: 60 * 60,
    });
  });

  it("confirms a linked phone and updates the user account", async () => {
    smsAuthChallengeRepositoryMock.findById.mockResolvedValue({
      id: "link-challenge-1",
      flow: "link_phone",
      phone: "+14155550123",
      codeHash: hashOtp("123456"),
      providerRequestId: "fake-link-1",
      metadata: {
        userId: "7",
        ipAddress: "127.0.0.1",
        provider: "fake",
        sessionId: "session-id",
      },
      attemptCount: 0,
      sendCount: 1,
      resendAvailableAt: new Date("2099-05-15T10:01:00.000Z"),
      expiresAt: new Date("2099-05-15T10:10:00.000Z"),
      confirmedAt: null,
      invalidatedAt: null,
      createdAt: new Date("2026-05-15T10:00:00.000Z"),
      updatedAt: new Date("2026-05-15T10:00:01.000Z"),
    });
    userRepositoryMock.findById.mockResolvedValue({
      id: 7n,
      email: "user@example.com",
      phone: null,
      name: "Jane",
      password: "hashed-password",
      sessionToken: "session-token",
    });
    userRepositoryMock.phoneExistsForOtherUser.mockResolvedValue(false);
    smsAuthChallengeRepositoryMock.markConfirmed.mockResolvedValue({
      id: "link-challenge-1",
      confirmedAt: new Date(),
    });
    userRepositoryMock.update.mockResolvedValue({
      id: 7n,
      email: "user@example.com",
      phone: "+14155550123",
      name: "Jane",
      password: "hashed-password",
      sessionToken: "session-token",
      createdAt: new Date("2026-05-15T10:00:00.000Z"),
      updatedAt: new Date("2026-05-15T10:01:00.000Z"),
      emailVerifiedAt: null,
      avatar: null,
      isAdmin: false,
      role: "user",
    });

    const { authService } = await loadAuthService();
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });

    const result = await authService.confirmPhoneLink(
      7n,
      {
        challengeId: "link-challenge-1",
        code: "123456",
      },
      {
        ipAddress: "127.0.0.1",
        sessionId: "session-id",
      },
    );

    expect(Result.isOk(result)).toBe(true);
    expect(userRepositoryMock.update).toHaveBeenCalledWith(7n, {
      phone: "+14155550123",
    });
  });

  it("rejects phone link confirmation when the challenge session does not match", async () => {
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
    smsAuthChallengeRepositoryMock.findById.mockResolvedValue({
      id: "link-challenge-1",
      flow: "link_phone",
      phone: "+14155550123",
      codeHash: hashOtp("123456"),
      providerRequestId: "fake-link-1",
      metadata: {
        userId: "7",
        ipAddress: "127.0.0.1",
        provider: "fake",
        sessionId: "other-session",
      },
      attemptCount: 0,
      sendCount: 1,
      resendAvailableAt: new Date("2099-05-15T10:01:00.000Z"),
      expiresAt: new Date("2099-05-15T10:10:00.000Z"),
      confirmedAt: null,
      invalidatedAt: null,
      createdAt: new Date("2026-05-15T10:00:00.000Z"),
      updatedAt: new Date("2026-05-15T10:00:01.000Z"),
    });

    const { authService } = await loadAuthService();
    const result = await authService.confirmPhoneLink(
      7n,
      {
        challengeId: "link-challenge-1",
        code: "123456",
      },
      {
        ipAddress: "127.0.0.1",
        sessionId: "session-id",
      },
    );

    expect(Result.isError(result)).toBe(true);
    expect(userRepositoryMock.findById).not.toHaveBeenCalled();
  });

  it("rejects phone link confirmation when the challenge has no session binding", async () => {
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
    smsAuthChallengeRepositoryMock.findById.mockResolvedValue({
      id: "link-challenge-1",
      flow: "link_phone",
      phone: "+14155550123",
      codeHash: hashOtp("123456"),
      providerRequestId: "fake-link-1",
      metadata: { userId: "7", ipAddress: "127.0.0.1", provider: "fake" },
      attemptCount: 0,
      sendCount: 1,
      resendAvailableAt: new Date("2099-05-15T10:01:00.000Z"),
      expiresAt: new Date("2099-05-15T10:10:00.000Z"),
      confirmedAt: null,
      invalidatedAt: null,
      createdAt: new Date("2026-05-15T10:00:00.000Z"),
      updatedAt: new Date("2026-05-15T10:00:01.000Z"),
    });

    const { authService } = await loadAuthService();
    const result = await authService.confirmPhoneLink(
      7n,
      {
        challengeId: "link-challenge-1",
        code: "123456",
      },
      {
        ipAddress: "127.0.0.1",
        sessionId: "session-id",
      },
    );

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "BadRequest",
        message:
          "Phone linking challenge must be confirmed from the same session",
      });
    }
    expect(userRepositoryMock.findById).not.toHaveBeenCalled();
  });

  it("enforces resend cooldown for phone linking on the server", async () => {
    userRepositoryMock.findById.mockResolvedValue({
      id: 7n,
      email: "user@example.com",
      phone: null,
      password: "hashed-password",
      sessionToken: "session-token",
    });
    validatePasswordMock.mockResolvedValue(true);
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
    userRepositoryMock.phoneExistsForOtherUser.mockResolvedValue(false);
    smsAuthChallengeRepositoryMock.findLatestPendingForPhoneFlow.mockResolvedValue(
      {
        id: "link-challenge-pending",
        flow: "link_phone",
        phone: "+14155550123",
        codeHash: "hashed-code",
        providerRequestId: "fake-link-1",
        metadata: { userId: "7", sessionId: "session-id" },
        attemptCount: 0,
        sendCount: 1,
        resendAvailableAt: new Date(Date.now() + 45_000),
        expiresAt: new Date(Date.now() + 10 * 60_000),
        confirmedAt: null,
        invalidatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    const { authService } = await loadAuthService();
    const result = await authService.startPhoneLink(
      7n,
      {
        phone: "+1 415 555 0123",
        currentPassword: "secret123",
      },
      { ipAddress: "127.0.0.1", sessionId: "session-id" },
    );

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error._tag).toBe("RateLimited");
    }
    expect(
      smsAuthChallengeRepositoryMock.invalidatePendingForPhoneFlow,
    ).not.toHaveBeenCalled();
    expect(issueVerificationCodeMock).not.toHaveBeenCalled();
  });
});
