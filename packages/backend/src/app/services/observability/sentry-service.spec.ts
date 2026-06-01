import { afterEach, describe, expect, it, vi } from "vitest";
import { internal } from "../shared/errors.js";

const {
  initMock,
  captureExceptionMock,
  captureMessageMock,
  flushMock,
  scopeMock,
  addEventProcessorMock,
  withScopeMock,
} = vi.hoisted(() => {
  const scope = {
    setTag: vi.fn(),
    setUser: vi.fn(),
    setExtra: vi.fn(),
  };

  return {
    initMock: vi.fn(),
    captureExceptionMock: vi.fn(),
    captureMessageMock: vi.fn(),
    flushMock: vi.fn().mockResolvedValue(true),
    addEventProcessorMock: vi.fn(),
    scopeMock: scope,
    withScopeMock: vi.fn(
      (callback: (scope: {
        setTag: (key: string, value: string) => void;
        setUser: (value: { id: string }) => void;
        setExtra: (key: string, value: unknown) => void;
      }) => void) => {
        callback(scope);
      },
    ),
  };
});

const originalEnv = { ...process.env };

vi.mock("@sentry/node", () => ({
  init: initMock,
  addEventProcessor: addEventProcessorMock,
  captureException: captureExceptionMock,
  captureMessage: captureMessageMock,
  flush: flushMock,
  withScope: withScopeMock,
}));

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, originalEnv);
}

async function loadSentryService() {
  return import("./sentry-service.js");
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  restoreEnv();
});

describe("sentryService", () => {
  it("stays disabled when DSN is unset", async () => {
    delete process.env["SENTRY_DSN"];
    process.env["SENTRY_ENABLED"] = "true";

    const { sentryService } = await loadSentryService();
    sentryService.init();

    expect(sentryService.isEnabled()).toBe(false);
    expect(initMock).not.toHaveBeenCalled();

    sentryService.captureException(new Error("boom"));
    sentryService.captureMessage("boom");
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(captureMessageMock).not.toHaveBeenCalled();
    await expect(sentryService.flush()).resolves.toBe(true);
  });

  it("stays disabled when the kill switch is off", async () => {
    process.env["SENTRY_DSN"] = "https://example.com/1";
    process.env["SENTRY_ENABLED"] = "false";

    const { sentryService } = await loadSentryService();
    sentryService.init();

    expect(sentryService.isEnabled()).toBe(false);
    expect(initMock).not.toHaveBeenCalled();

    sentryService.captureException(new Error("boom"));
    sentryService.captureMessage("boom");
    await expect(sentryService.flush()).resolves.toBe(true);
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(captureMessageMock).not.toHaveBeenCalled();
  });

  it("maps context onto Sentry scope", async () => {
    process.env["SENTRY_DSN"] = "https://example.com/1";
    process.env["SENTRY_ENABLED"] = "true";
    process.env["SENTRY_ENVIRONMENT"] = "prod";
    process.env["SENTRY_RELEASE"] = "abc123";
    process.env["SENTRY_TRACES_SAMPLE_RATE"] = "0.25";

    const { sentryService } = await loadSentryService();
    sentryService.init();

    const error = new Error("request failed");
    sentryService.captureException(error, {
      requestId: "r-1",
      userId: "42",
      route: "/api/x",
      method: "POST",
      tags: { custom: "value" },
      extra: { articleId: 7 },
    });

    expect(initMock).toHaveBeenCalledTimes(1);
    expect(addEventProcessorMock).toHaveBeenCalledTimes(1);
    expect(withScopeMock).toHaveBeenCalledTimes(1);
    expect(scopeMock.setTag).toHaveBeenCalledWith("custom", "value");
    expect(scopeMock.setTag).toHaveBeenCalledWith("requestId", "r-1");
    expect(scopeMock.setTag).toHaveBeenCalledWith("route", "/api/x");
    expect(scopeMock.setTag).toHaveBeenCalledWith("method", "POST");
    expect(scopeMock.setUser).toHaveBeenCalledWith({ id: "42" });
    expect(scopeMock.setExtra).toHaveBeenCalledWith("articleId", 7);
    expect(captureExceptionMock).toHaveBeenCalledWith(error);
  });

  it("flushes after init", async () => {
    process.env["SENTRY_DSN"] = "https://example.com/1";
    process.env["SENTRY_ENABLED"] = "true";

    const { sentryService } = await loadSentryService();
    sentryService.init();

    await expect(sentryService.flush(1234)).resolves.toBe(true);
    expect(flushMock).toHaveBeenCalledWith(1234);
  });

  it("scrubs event processor payloads", async () => {
    process.env["SENTRY_DSN"] = "https://example.com/1";
    process.env["SENTRY_ENABLED"] = "true";

    const { sentryService } = await loadSentryService();
    sentryService.init();

    const eventProcessor = addEventProcessorMock.mock.calls[0]?.[0] as
      | ((event: Record<string, unknown>) => Record<string, unknown> | null)
      | undefined;
    if (eventProcessor === undefined) {
      throw new Error("event processor was not configured");
    }

    const event = {
      tags: {
        apiToken: "abc",
        safe: "ok",
      },
      extra: {
        password: "secret",
        keep: "value",
      },
      contexts: {
        sessionCookie: "cookie",
        keep: { foo: "bar" },
      },
      request: {
        status_code: 500,
        headers: {
          authorization: "Bearer token",
          cookie: "session=abc",
          "x-request-id": "r-1",
        },
        data: "x".repeat(50 * 1024),
      },
    };

    const sanitized = eventProcessor(event);
    expect(sanitized).not.toBeNull();
    const sanitizedEvent = sanitized as {
      tags?: Record<string, unknown>;
      extra?: Record<string, unknown>;
      contexts?: Record<string, unknown>;
      request?: Record<string, unknown>;
    };
    expect(sanitizedEvent.tags).toEqual({ safe: "ok" });
    expect(sanitizedEvent.extra).toEqual({ keep: "value" });
    expect(sanitizedEvent.contexts).toEqual({ keep: { foo: "bar" } });
    expect((sanitizedEvent.request)?.["headers"]).toEqual({
      "x-request-id": "r-1",
    });
    expect((sanitizedEvent.request)?.["data"]).toBeUndefined();
  });

  it("normalizes internal app errors before capturing them", async () => {
    process.env["SENTRY_DSN"] = "https://example.com/1";
    process.env["SENTRY_ENABLED"] = "true";

    const { sentryService } = await loadSentryService();
    sentryService.init();

    const cause = new Error("db down");
    sentryService.captureException(internal(cause, "Failed to load profile"));

    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    const captured = captureExceptionMock.mock.calls[0]?.[0] as Error & {
      cause?: unknown;
    };
    expect(captured).toBeInstanceOf(Error);
    expect(captured.message).toBe("Failed to load profile");
    expect(captured.name).toBe("AppError.Internal");
    expect(captured.cause).toBe(cause);
  });

  it("truncates request data when status_code is missing", async () => {
    process.env["SENTRY_DSN"] = "https://example.com/1";
    process.env["SENTRY_ENABLED"] = "true";

    const { sentryService } = await loadSentryService();
    sentryService.init();

    const eventProcessor = addEventProcessorMock.mock.calls[0]?.[0] as
      | ((event: Record<string, unknown>) => Record<string, unknown> | null)
      | undefined;
    if (eventProcessor === undefined) {
      throw new Error("event processor was not configured");
    }

    const sanitized = eventProcessor({
      request: {
        data: "x".repeat(50 * 1024),
      },
    });

    expect(sanitized).not.toBeNull();
    const request = (sanitized as { request?: Record<string, unknown> }).request;
    expect(request?.["data"]).toHaveLength(10 * 1024);
  });
});
