import { Result } from "better-result";
import { afterEach, describe, expect, it, vi } from "vitest";

const userRepositoryMock = {
  findById: vi.fn(),
  update: vi.fn(),
};

const emailVerificationRepositoryMock = {
  create: vi.fn(),
  findByTokenHash: vi.fn(),
  invalidatePendingByUserId: vi.fn(),
  markUsed: vi.fn(),
};

const emailServiceMock = {
  send: vi.fn(),
};

const loggerMock = {
  warn: vi.fn(),
  error: vi.fn(),
};

const originalEnv = { ...process.env };

vi.mock("#app/repositories/index.js", () => ({
  userRepository: userRepositoryMock,
  emailVerificationRepository: emailVerificationRepositoryMock,
}));

vi.mock("#app/services/email-service.js", () => ({
  emailService: emailServiceMock,
}));

vi.mock("#logger", () => ({
  default: loggerMock,
}));

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, originalEnv);
}

async function loadEmailVerificationService() {
  process.env["FRONTEND_URL"] = "https://app.example.com";
  process.env["APP_URL"] = "https://app.example.com";
  return import("./email-verification-service.js");
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  restoreEnv();
});

describe("emailVerificationService", () => {
  it("sends a verification email for an unverified user", async () => {
    userRepositoryMock.findById.mockResolvedValue({
      id: 7n,
      name: "Jane",
      email: "jane@example.com",
      emailVerifiedAt: null,
    });
    emailVerificationRepositoryMock.invalidatePendingByUserId.mockResolvedValue(
      1,
    );
    emailVerificationRepositoryMock.create.mockResolvedValue({
      id: 11n,
      userId: 7n,
    });
    emailServiceMock.send.mockResolvedValue(
      Result.ok({
        accepted: ["jane@example.com"],
        messageId: "message-id",
        rejected: [],
        response: "250 OK",
      }),
    );

    const { emailVerificationService } = await loadEmailVerificationService();
    const result = await emailVerificationService.sendVerificationEmail(7n);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({ message: "Verification email sent" });
    }
    expect(
      emailVerificationRepositoryMock.invalidatePendingByUserId,
    ).toHaveBeenCalledWith(7n);
    expect(emailVerificationRepositoryMock.create).toHaveBeenCalledTimes(1);
    expect(emailServiceMock.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jane@example.com",
        subject: "Confirm your email",
      }),
    );
  });

  it("returns success when the user is already verified", async () => {
    userRepositoryMock.findById.mockResolvedValue({
      id: 7n,
      emailVerifiedAt: new Date(),
    });

    const { emailVerificationService } = await loadEmailVerificationService();
    const result = await emailVerificationService.queueVerificationEmail(7n);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({ message: "Email is already verified" });
    }
  });

  it("rejects expired verification links", async () => {
    emailVerificationRepositoryMock.findByTokenHash.mockResolvedValue({
      id: 11n,
      userId: 7n,
      tokenHash: "hash",
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
      createdAt: new Date(),
    });
    emailVerificationRepositoryMock.markUsed.mockResolvedValue({ id: 11n });

    const { emailVerificationService } = await loadEmailVerificationService();
    const result = await emailVerificationService.verifyEmail("expired-token");

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toEqual({
        _tag: "BadRequest",
        message: "Verification link has expired",
      });
    }
    expect(emailVerificationRepositoryMock.markUsed).toHaveBeenCalledWith(11n);
  });

  it("verifies an unverified user and marks the token used", async () => {
    emailVerificationRepositoryMock.findByTokenHash.mockResolvedValue({
      id: 11n,
      userId: 7n,
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
    });
    userRepositoryMock.findById.mockResolvedValue({
      id: 7n,
      emailVerifiedAt: null,
    });
    userRepositoryMock.update.mockResolvedValue({
      id: 7n,
      emailVerifiedAt: new Date(),
    });
    emailVerificationRepositoryMock.markUsed.mockResolvedValue({
      id: 11n,
      usedAt: new Date(),
    });

    const { emailVerificationService } = await loadEmailVerificationService();
    const result = await emailVerificationService.verifyEmail("valid-token");

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({
        message: "Email confirmed successfully",
      });
    }
    expect(userRepositoryMock.update).toHaveBeenCalledWith(7n, {
      emailVerifiedAt: expect.any(Date),
    });
    expect(emailVerificationRepositoryMock.markUsed).toHaveBeenCalledWith(11n);
  });

  it("keeps background logging on service failure", async () => {
    userRepositoryMock.findById.mockRejectedValue(new Error("db down"));

    const { emailVerificationService } = await loadEmailVerificationService();

    await emailVerificationService.sendVerificationEmailInBackground(
      7n,
      "manual resend",
    );

    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "7",
        reason: "Failed to load user",
        trigger: "manual resend",
      }),
      "Failed to send verification email in background",
    );
  });
});
