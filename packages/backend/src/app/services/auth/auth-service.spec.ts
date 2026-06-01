import { Result } from "better-result";
import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

const userRepositoryMock = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  emailExistsForOtherUser: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
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
const sendVerificationEmailAfterRegistrationMock = vi.fn();
const sendLinkVerificationEmailMock = vi.fn();
const ROTATED_LOGOUT_CSRF_TOKEN = "b".repeat(43);
const ROTATED_LOGOUT_ALL_CSRF_TOKEN = "c".repeat(43);

vi.mock("#app/repositories/index.js", () => ({
  userRepository: userRepositoryMock,
}));

vi.mock("#app/transformers/index.js", () => ({
  userTransformer: {
    serialize: vi.fn((user: { id: bigint; email: string }) => ({
      id: String(user.id),
      email: user.email,
    })),
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
    sendVerificationEmailAfterRegistration:
      sendVerificationEmailAfterRegistrationMock,
    sendLinkVerificationEmail: sendLinkVerificationEmailMock,
  },
}));

vi.mock("#app/services/auth/auth-throttle-service.js", () => ({
  consumeAuthThrottle: consumeAuthThrottleMock,
}));

async function loadAuthService() {
  return import("./auth-service.js");
}

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, ORIGINAL_ENV);
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  restoreEnv();
  sessionMock.sessionInfo = {
    id: "session-id",
    data: {},
  };
});

describe("authService", () => {
  it("registers a new email user and returns a generic accepted response", async () => {
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
    userRepositoryMock.findByEmail.mockResolvedValue(undefined);
    hashPasswordMock.mockResolvedValue("hashed-password");
    userRepositoryMock.create.mockResolvedValue({
      id: 7n,
      email: "user@example.com",
      sessionToken: "session-token",
    });
    sessionMock.destroySession.mockResolvedValue(undefined);

    const { authService } = await loadAuthService();
    const result = await authService.registerByEmail(
      {
        name: "Jane",
        email: "user@example.com",
        password: "secret",
        token: "",
      },
      authMock as any,
      sessionMock as any,
      loggerMock as any,
      { ipAddress: "127.0.0.1" },
    );

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({
        status: "success",
        message:
          "If the email can be used for registration, continue with the verification instructions sent to your inbox.",
      });
    }
    expect(sessionMock.destroySession).toHaveBeenCalledWith("session-id");
    expect(authMock.login).not.toHaveBeenCalled();
    expect(generateWsTokenMock).not.toHaveBeenCalled();
  });

  it("registers and authenticates an email user immediately when strict registration is disabled", async () => {
    process.env["AUTH_STRICT_REGISTRATION"] = "false";
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
    userRepositoryMock.findByEmail.mockResolvedValue(undefined);
    hashPasswordMock.mockResolvedValue("hashed-password");
    userRepositoryMock.create.mockResolvedValue({
      id: 7n,
      email: "user@example.com",
      sessionToken: "session-token",
    });
    sessionMock.destroySession.mockResolvedValue(undefined);
    authMock.login.mockResolvedValue(true);
    generateWsTokenMock.mockResolvedValue("ws-token");

    const { authService } = await loadAuthService();
    const result = await authService.registerByEmail(
      {
        name: "Jane",
        email: "user@example.com",
        password: "secret",
        token: "",
      },
      authMock as any,
      sessionMock as any,
      loggerMock as any,
      { ipAddress: "127.0.0.1" },
    );

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({
        status: "success",
        user: {
          id: "7",
          email: "user@example.com",
        },
        wsUrl: "wss://example.com/ws",
        wsToken: "ws-token",
      });
    }
    expect(sendVerificationEmailAfterRegistrationMock).toHaveBeenCalledWith(7n);
    expect(sessionMock.destroySession).toHaveBeenCalledWith("session-id");
    expect(authMock.login).toHaveBeenCalledWith("7", "session-token");
    expect(generateWsTokenMock).toHaveBeenCalledWith(
      sessionMock.sessionInfo,
      "7",
    );
  });

  it("returns a generic success when register email already exists", async () => {
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
    userRepositoryMock.findByEmail.mockResolvedValue({
      id: 7n,
      email: "user@example.com",
    });

    const { authService } = await loadAuthService();
    const result = await authService.registerByEmail(
      {
        name: "Jane",
        email: "user@example.com",
        password: "secret",
        token: "",
      },
      authMock as any,
      sessionMock as any,
      loggerMock as any,
      { ipAddress: "127.0.0.1" },
    );

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({
        status: "success",
        message:
          "If the email can be used for registration, continue with the verification instructions sent to your inbox.",
      });
    }
    expect(userRepositoryMock.create).not.toHaveBeenCalled();
  });

  it("returns internal error when login session establishment fails", async () => {
    userRepositoryMock.findByEmail.mockResolvedValue({
      id: 7n,
      email: "user@example.com",
      emailVerifiedAt: new Date("2026-05-30T00:00:00.000Z"),
      password: "hashed-password",
      sessionToken: "session-token",
    });
    validatePasswordMock.mockResolvedValue(true);
    authMock.login.mockResolvedValue(false);

    const { authService } = await loadAuthService();
    const result = await authService.login(
      {
        email: "user@example.com",
        password: "secret",
        token: "",
      },
      authMock as any,
      sessionMock as any,
    );

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "Internal",
        publicMessage: "Failed to log in user",
      });
    }
    expect(generateWsTokenMock).not.toHaveBeenCalled();
  });

  it("starts email linking for a phone-only account after re-authentication", async () => {
    userRepositoryMock.findById.mockResolvedValue({
      id: 9n,
      email: null,
      password: "stored-password-hash",
    });
    validatePasswordMock.mockResolvedValue(true);
    consumeAuthThrottleMock
      .mockResolvedValueOnce({ allowed: true, count: 1 })
      .mockResolvedValueOnce({ allowed: true, count: 1 })
      .mockResolvedValueOnce({ allowed: true, count: 1 });
    userRepositoryMock.emailExistsForOtherUser.mockResolvedValue(false);
    sendLinkVerificationEmailMock.mockResolvedValue(
      Result.ok({ message: "Verification email will be sent shortly" }),
    );

    const { authService } = await loadAuthService();
    const result = await authService.startEmailLink(9n, {
      email: "phone-only@example.com",
      currentPassword: "secret123",
    });

    expect(Result.isOk(result)).toBe(true);
    expect(consumeAuthThrottleMock).toHaveBeenNthCalledWith(1, {
      scope: "link_email_target",
      key: "phone-only@example.com",
      limit: 3,
      windowSeconds: 60 * 60,
    });
    expect(consumeAuthThrottleMock).toHaveBeenNthCalledWith(2, {
      scope: "link_email_user",
      key: "9",
      limit: 3,
      windowSeconds: 60 * 60,
    });
    expect(consumeAuthThrottleMock).toHaveBeenNthCalledWith(3, {
      scope: "link_email_user_cooldown",
      key: "9",
      limit: 1,
      windowSeconds: 60,
    });
    expect(sendLinkVerificationEmailMock).toHaveBeenCalledWith(
      9n,
      "phone-only@example.com",
    );
  });

  it("throttles email linking by target email", async () => {
    userRepositoryMock.findById.mockResolvedValue({
      id: 9n,
      email: null,
      password: "stored-password-hash",
    });
    validatePasswordMock.mockResolvedValue(true);
    consumeAuthThrottleMock.mockResolvedValueOnce({ allowed: false, count: 4 });

    const { authService } = await loadAuthService();
    const result = await authService.startEmailLink(9n, {
      email: "victim@example.com",
      currentPassword: "secret123",
    });

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "BadRequest",
        message: "Too many verification attempts. Please try again later.",
      });
    }
    expect(sendLinkVerificationEmailMock).not.toHaveBeenCalled();
  });

  it("throttles email linking by user cooldown", async () => {
    userRepositoryMock.findById.mockResolvedValue({
      id: 9n,
      email: null,
      password: "stored-password-hash",
    });
    validatePasswordMock.mockResolvedValue(true);
    consumeAuthThrottleMock
      .mockResolvedValueOnce({ allowed: true, count: 1 })
      .mockResolvedValueOnce({ allowed: true, count: 1 })
      .mockResolvedValueOnce({ allowed: false, count: 2 });

    const { authService } = await loadAuthService();
    const result = await authService.startEmailLink(9n, {
      email: "victim@example.com",
      currentPassword: "secret123",
    });

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "BadRequest",
        message: "Too many verification attempts. Please try again later.",
      });
    }
    expect(sendLinkVerificationEmailMock).not.toHaveBeenCalled();
  });

  it("returns unauthorized when login email is unknown", async () => {
    userRepositoryMock.findByEmail.mockResolvedValue(undefined);

    const { authService } = await loadAuthService();
    const result = await authService.login(
      {
        email: "missing@example.com",
        password: "secret",
        token: "",
      },
      authMock as any,
      sessionMock as any,
    );

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "Unauthorized",
        message: "Invalid email or password",
      });
    }
    expect(authMock.login).not.toHaveBeenCalled();
  });

  it("returns unauthorized when login password is invalid", async () => {
    userRepositoryMock.findByEmail.mockResolvedValue({
      id: 7n,
      email: "user@example.com",
      emailVerifiedAt: new Date("2026-05-30T00:00:00.000Z"),
      password: "hashed-password",
      sessionToken: "session-token",
    });
    validatePasswordMock.mockResolvedValue(false);

    const { authService } = await loadAuthService();
    const result = await authService.login(
      {
        email: "user@example.com",
        password: "wrong-secret",
        token: "",
      },
      authMock as any,
      sessionMock as any,
    );

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "Unauthorized",
        message: "Invalid email or password",
      });
    }
    expect(authMock.login).not.toHaveBeenCalled();
  });

  it("blocks email password login for unverified users when strict registration is enabled", async () => {
    userRepositoryMock.findByEmail.mockResolvedValue({
      id: 7n,
      email: "user@example.com",
      emailVerifiedAt: null,
      password: "hashed-password",
      sessionToken: "session-token",
    });
    validatePasswordMock.mockResolvedValue(true);

    const { authService } = await loadAuthService();
    const result = await authService.login(
      {
        email: "user@example.com",
        password: "secret",
        token: "",
      },
      authMock as any,
      sessionMock as any,
    );

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "BadRequest",
        message: "Email verification required",
      });
    }
    expect(authMock.login).not.toHaveBeenCalled();
  });

  it("allows email password login for unverified users when strict registration is disabled", async () => {
    process.env["AUTH_STRICT_REGISTRATION"] = "false";
    userRepositoryMock.findByEmail.mockResolvedValue({
      id: 7n,
      email: "user@example.com",
      emailVerifiedAt: null,
      password: "hashed-password",
      sessionToken: "session-token",
    });
    validatePasswordMock.mockResolvedValue(true);
    authMock.login.mockResolvedValue(true);
    generateWsTokenMock.mockResolvedValue("ws-token");

    const { authService } = await loadAuthService();
    const result = await authService.login(
      {
        email: "user@example.com",
        password: "secret",
        token: "",
      },
      authMock as any,
      sessionMock as any,
    );

    expect(Result.isOk(result)).toBe(true);
    expect(authMock.login).toHaveBeenCalledWith("7", "session-token");
  });

  it("returns the rotated CSRF token after logout mutates the session", async () => {
    authMock.logout.mockImplementation(async () => {
      sessionMock.sessionInfo = {
        id: "anonymous-session-id",
        data: { csrfToken: ROTATED_LOGOUT_CSRF_TOKEN },
      };
      return true;
    });

    const { authService } = await loadAuthService();
    const result = await authService.logout(
      authMock as any,
      sessionMock as any,
    );

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({
        status: "success",
        csrfToken: ROTATED_LOGOUT_CSRF_TOKEN,
      });
    }
  });

  it("returns the rotated CSRF token after logoutAll mutates the session", async () => {
    authMock.logoutAll.mockImplementation(async () => {
      sessionMock.sessionInfo = {
        id: "anonymous-session-id",
        data: { csrfToken: ROTATED_LOGOUT_ALL_CSRF_TOKEN },
      };
      return 3;
    });

    const { authService } = await loadAuthService();
    const result = await authService.logoutAll(
      authMock as any,
      sessionMock as any,
    );

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({
        status: "success",
        deletedCount: 3,
        csrfToken: ROTATED_LOGOUT_ALL_CSRF_TOKEN,
      });
    }
  });

  it("returns not found when changePassword user is missing", async () => {
    userRepositoryMock.findById.mockResolvedValue(undefined);

    const { authService } = await loadAuthService();
    const result = await authService.changePassword(7n, {
      currentPassword: "old-secret",
      newPassword: "new-secret",
    });

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "NotFound",
        resource: "User",
        message: "User not found",
      });
    }
    expect(userRepositoryMock.update).not.toHaveBeenCalled();
  });
});
