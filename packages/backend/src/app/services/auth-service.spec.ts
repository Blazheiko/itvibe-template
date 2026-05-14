import { Result } from "better-result";
import { afterEach, describe, expect, it, vi } from "vitest";

const userRepositoryMock = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
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

const hashPasswordMock = vi.fn();
const validatePasswordMock = vi.fn();
const sendVerificationEmailAfterRegistrationMock = vi.fn();

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

vi.mock("#app/services/email-verification-service.js", () => ({
  emailVerificationService: {
    sendVerificationEmailAfterRegistration:
      sendVerificationEmailAfterRegistrationMock,
  },
}));

async function loadAuthService() {
  return import("./auth-service.js");
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  sessionMock.sessionInfo = {
    id: "session-id",
    data: {},
  };
});

describe("authService", () => {
  it("registers a new user and returns the serialized user", async () => {
    userRepositoryMock.findByEmail.mockResolvedValue(undefined);
    hashPasswordMock.mockResolvedValue("hashed-password");
    userRepositoryMock.create.mockResolvedValue({
      id: 7n,
      email: "user@example.com",
      sessionToken: "session-token",
    });
    sessionMock.destroySession.mockResolvedValue(undefined);
    authMock.login.mockResolvedValue(true);

    const { authService } = await loadAuthService();
    const result = await authService.register(
      {
        name: "Jane",
        email: "user@example.com",
        password: "secret",
        token: "",
        promoCode: "",
        refCode: "",
      },
      authMock as any,
      sessionMock as any,
    );

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({
        status: "success",
        user: {
          id: "7",
          email: "user@example.com",
        },
      });
    }
    expect(sessionMock.destroySession).toHaveBeenCalledWith("session-id");
    expect(authMock.login).toHaveBeenCalledWith("7", "session-token");
    expect(sendVerificationEmailAfterRegistrationMock).toHaveBeenCalledWith(7n);
  });

  it("returns conflict when register email already exists", async () => {
    userRepositoryMock.findByEmail.mockResolvedValue({
      id: 7n,
      email: "user@example.com",
    });

    const { authService } = await loadAuthService();
    const result = await authService.register(
      {
        name: "Jane",
        email: "user@example.com",
        password: "secret",
        token: "",
        promoCode: "",
        refCode: "",
      },
      authMock as any,
      sessionMock as any,
    );

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "Conflict",
        message: "Email already exist",
      });
    }
    expect(userRepositoryMock.create).not.toHaveBeenCalled();
  });

  it("returns internal error when auto-login fails after registration", async () => {
    userRepositoryMock.findByEmail.mockResolvedValue(undefined);
    hashPasswordMock.mockResolvedValue("hashed-password");
    userRepositoryMock.create.mockResolvedValue({
      id: 7n,
      email: "user@example.com",
      sessionToken: "session-token",
    });
    sessionMock.destroySession.mockResolvedValue(undefined);
    authMock.login.mockResolvedValue(false);

    const { authService } = await loadAuthService();
    const result = await authService.register(
      {
        name: "Jane",
        email: "user@example.com",
        password: "secret",
        token: "",
        promoCode: "",
        refCode: "",
      },
      authMock as any,
      sessionMock as any,
    );

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "Internal",
        publicMessage: "Failed to log in newly registered user",
      });
    }
  });

  it("returns login success for valid credentials", async () => {
    userRepositoryMock.findByEmail.mockResolvedValue({
      id: 7n,
      email: "user@example.com",
      password: "hashed-password",
      sessionToken: "session-token",
    });
    validatePasswordMock.mockResolvedValue(true);
    authMock.login.mockResolvedValue(true);

    const { authService } = await loadAuthService();
    const result = await authService.login(
      {
        email: "user@example.com",
        password: "secret",
        token: "",
      },
      authMock as any,
    );

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({
        status: "success",
        user: {
          id: "7",
          email: "user@example.com",
        },
      });
    }
  });
});
