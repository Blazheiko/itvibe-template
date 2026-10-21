import { Result } from "better-result";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
const resetAuthThrottleMock = vi.fn();
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
  resetAuthThrottle: resetAuthThrottleMock,
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

beforeEach(() => {
  consumeAuthThrottleMock.mockReset();
  consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
  resetAuthThrottleMock.mockReset();
  resetAuthThrottleMock.mockResolvedValue(undefined);
});

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
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
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
      { ipAddress: "127.0.0.1" },
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
    expect(consumeAuthThrottleMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        scope: "link_email_target",
        limit: 3,
        windowMs: 60 * 60 * 1000,
      }),
      "phone-only@example.com",
    );
    expect(consumeAuthThrottleMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        scope: "link_email_user",
        limit: 3,
        windowMs: 60 * 60 * 1000,
      }),
      "9",
    );
    expect(consumeAuthThrottleMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        scope: "link_email_user_cooldown",
        limit: 1,
        windowMs: 60 * 1000,
      }),
      "9",
    );
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
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
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
      { ipAddress: "127.0.0.1" },
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
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
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
      { ipAddress: "127.0.0.1" },
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
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
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
      { ipAddress: "127.0.0.1" },
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
    consumeAuthThrottleMock.mockResolvedValue({ allowed: true, count: 1 });
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
      { ipAddress: "127.0.0.1" },
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

describe("auth throttle fail-closed (email link)", () => {
  it("rejects email linking without sending the verification email", async () => {
    consumeAuthThrottleMock.mockReset();
    consumeAuthThrottleMock.mockRejectedValue(new Error("redis down"));
    userRepositoryMock.findById.mockResolvedValue({
      id: 9n,
      email: null,
      password: "stored-password-hash",
    });
    validatePasswordMock.mockResolvedValue(true);

    const { authService } = await loadAuthService();
    const result = await authService.startEmailLink(9n, {
      email: "phone-only@example.com",
      currentPassword: "secret123",
    });

    expect(Result.isError(result)).toBe(true);
    expect(consumeAuthThrottleMock).toHaveBeenCalledTimes(1);
    expect(sendLinkVerificationEmailMock).not.toHaveBeenCalled();
  });
});

describe("authService while Redis is unavailable", () => {
  const LOGIN_INPUT = { email: "user@example.com", password: "secret", token: "" };
  const LOGIN_CONTEXT = { ipAddress: "127.0.0.1" };

  const arrangeLogin = (): void => {
    userRepositoryMock.findByEmail.mockResolvedValue({
      id: 7n,
      email: "user@example.com",
      emailVerifiedAt: new Date("2026-05-30T00:00:00.000Z"),
      password: "hashed-password",
      sessionToken: "session-token",
    });
    validatePasswordMock.mockResolvedValue(true);
  };

  /** What the controller answers for this AppError (status, headers, body). */
  const toResponse = async (error: unknown) => {
    const { mapControllerError } = await import(
      "#app/controllers/shared/controller-error.js"
    );
    const headers = new Map<string, string>();
    const responseData = {
      status: 200,
      setHeader: (name: string, value: string) => {
        headers.set(name, value);
      },
    };
    const payload = mapControllerError({ responseData } as never, error as never);
    return { status: responseData.status, headers, payload };
  };

  const operations: [string, () => void, (s: Awaited<ReturnType<typeof loadAuthService>>["authService"]) => Promise<unknown>][] = [
    [
      "login",
      () => {
        arrangeLogin();
      },
      (s) => s.login(LOGIN_INPUT, authMock as any, sessionMock as any, LOGIN_CONTEXT),
    ],
    [
      "WS token generation during login",
      () => {
        arrangeLogin();
        authMock.login.mockResolvedValue(true);
      },
      (s) => s.login(LOGIN_INPUT, authMock as any, sessionMock as any, LOGIN_CONTEXT),
    ],
    ["logout", () => {}, (s) => s.logout(authMock as any, sessionMock as any)],
    ["logoutAll", () => {}, (s) => s.logoutAll(authMock as any, sessionMock as any)],
  ];

  const failWith = (name: string, err: Error): void => {
    if (name.startsWith("WS token")) generateWsTokenMock.mockRejectedValue(err);
    else if (name === "login") authMock.login.mockRejectedValue(err);
    else if (name === "logout") authMock.logout.mockRejectedValue(err);
    else authMock.logoutAll.mockRejectedValue(err);
  };

  it.each(operations)(
    "%s: RedisUnavailableError → 503 service_unavailable with Retry-After",
    async (name, arrange, run) => {
      const { RedisUnavailableError } = await import(
        "#vendor/utils/network/errors/redis-unavailable-error.js"
      );
      arrange();
      failWith(
        name,
        new RedisUnavailableError("Redis command failed", {
          cause: new Error("Command timed out"),
        }),
      );
      const { authService } = await loadAuthService();

      const result = (await run(authService)) as Result<unknown, unknown>;

      expect(Result.isError(result)).toBe(true);
      if (!Result.isError(result)) return;
      const response = await toResponse(result.error);
      expect(response.status).toBe(503);
      expect(response.headers.get("Retry-After")).toBe("1");
      expect(response.payload).toEqual({
        status: "error",
        code: "service_unavailable",
        message: "Service temporarily unavailable. Try again later.",
      });
      expect(JSON.stringify(response.payload)).not.toMatch(/timed out|Failed to/);
      // A partial logoutAll never reports success or a deletedCount.
      expect(JSON.stringify(response.payload)).not.toContain("deletedCount");
    },
  );

  it.each(operations)("%s: any other error → 500 as before", async (name, arrange, run) => {
    arrange();
    failWith(name, new Error("boom"));
    const { authService } = await loadAuthService();

    const result = (await run(authService)) as Result<unknown, unknown>;

    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) return;
    const response = await toResponse(result.error);
    expect(response.status).toBe(500);
    expect(response.headers.has("Retry-After")).toBe(false);
  });
});
