import * as Sentry from "@sentry/node";
import type { Event, NodeOptions, Scope, SeverityLevel } from "@sentry/node";

import sentryConfig from "#config/sentry.js";
import { appErrorMessage, type AppError } from "./shared/errors.js";

const MAX_REQUEST_DATA_BYTES = 10 * 1024;
const SENSITIVE_KEY_RE = /token|secret|password|cookie|auth|api[_-]?key|bearer/i;
const REDACTED_HEADER_KEYS = new Set(["authorization", "cookie"]);

export interface SentryContext {
  requestId?: string | undefined;
  userId?: string | undefined;
  route?: string | undefined;
  method?: string | undefined;
  tags?: Record<string, string> | undefined;
  extra?: Record<string, unknown> | undefined;
}

let initAttempted = false;
let active = false;

type SentryInitOptions = NodeOptions;

function toUserId(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value;
}

function applyScopeContext(scope: Scope, ctx: SentryContext): void {
  if (ctx.tags !== undefined) {
    for (const [key, value] of Object.entries(ctx.tags)) {
      scope.setTag(key, value);
    }
  }

  if (ctx.requestId !== undefined) {
    scope.setTag("requestId", ctx.requestId);
  }

  if (ctx.route !== undefined) {
    scope.setTag("route", ctx.route);
  }

  if (ctx.method !== undefined) {
    scope.setTag("method", ctx.method);
  }

  const userId = toUserId(ctx.userId);
  if (userId !== undefined) {
    scope.setUser({ id: userId });
  }

  if (ctx.extra !== undefined) {
    for (const [key, value] of Object.entries(ctx.extra)) {
      scope.setExtra(key, value);
    }
  }
}

function safeStringify(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function truncateUtf8(value: string, maxBytes: number): string {
  const buffer = Buffer.from(value, "utf8");
  if (buffer.byteLength <= maxBytes) {
    return value;
  }

  return buffer.subarray(0, maxBytes).toString("utf8");
}

function sanitizeRecord(record: Record<string, unknown>): void {
  for (const key of Object.keys(record)) {
    if (SENSITIVE_KEY_RE.test(key)) {
      delete record[key];
    }
  }
}

function sanitizeHeaders(headers: Record<string, unknown>): void {
  for (const key of Object.keys(headers)) {
    if (REDACTED_HEADER_KEYS.has(key.toLowerCase()) || SENSITIVE_KEY_RE.test(key)) {
      delete headers[key];
    }
  }
}

function sanitizeRequestData(request: Record<string, unknown>): void {
  const statusCodeRaw = request["status_code"];
  const statusCode =
    typeof statusCodeRaw === "number"
      ? statusCodeRaw
      : typeof statusCodeRaw === "string"
        ? Number(statusCodeRaw)
        : Number.NaN;

  if (Number.isFinite(statusCode) && statusCode >= 400) {
    delete request["data"];
    return;
  }

  const rawData = request["data"];
  if (rawData === undefined || rawData === null) {
    return;
  }

  if (typeof rawData === "string") {
    request["data"] = truncateUtf8(rawData, MAX_REQUEST_DATA_BYTES);
    return;
  }

  const serialized = safeStringify(rawData);
  if (Buffer.byteLength(serialized, "utf8") <= MAX_REQUEST_DATA_BYTES) {
    return;
  }

  request["data"] = truncateUtf8(serialized, MAX_REQUEST_DATA_BYTES);
}

function sanitizeEvent(event: Event): Event {
  if (event.tags !== undefined) {
    sanitizeRecord(event.tags as Record<string, unknown>);
  }

  if (event.extra !== undefined) {
    sanitizeRecord(event.extra as Record<string, unknown>);
  }

  if (event.contexts !== undefined) {
    sanitizeRecord(event.contexts as Record<string, unknown>);
  }

  if (event.request !== undefined) {
    const request = event.request as Record<string, unknown>;
    const headers = request["headers"];
    if (headers !== undefined && headers !== null && typeof headers === "object") {
      sanitizeHeaders(headers as Record<string, unknown>);
    }

    sanitizeRequestData(request);
  }

  return event;
}

function isEnabled(): boolean {
  return active;
}


function isAppError(value: unknown): value is AppError {
  return typeof value === "object" && value !== null && "_tag" in value;
}

function normalizeException(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }

  if (isAppError(value)) {
    const message = appErrorMessage(value);
    const error = new Error(message) as Error & {
      cause?: unknown;
      resource?: string;
      reason?: string;
    };
    error.name = `AppError.${value._tag}`;
    if (value._tag === "Internal" && value.cause !== undefined) {
      error.cause = value.cause;
    }
    if ("resource" in value && typeof value.resource === "string") {
      error.resource = value.resource;
    }
    if ("reason" in value && typeof value.reason === "string") {
      error.reason = value.reason;
    }
    return error;
  }

  if (value !== null && typeof value === "object") {
    const errorLike = value as { name?: unknown; message?: unknown; stack?: unknown };
    const message = typeof errorLike.message === "string" ? errorLike.message : "Unknown error";
    const error = new Error(message);
    if (typeof errorLike.name === "string") {
      error.name = errorLike.name;
    }
    if (typeof errorLike.stack === "string") {
      error.stack = errorLike.stack;
    }
    return error;
  }

  return new Error(typeof value === "string" ? value : "Unknown error");
}

function withScope<T>(ctx: SentryContext, fn: () => T): T {
  if (!isEnabled()) {
    return fn();
  }

  let result: T | undefined;
  Sentry.withScope((scope: Scope) => {
    applyScopeContext(scope, ctx);
    result = fn();
  });
  return result as T;
}

function captureException(err: unknown, ctx: SentryContext = {}): void {
  if (!isEnabled()) {
    return;
  }

  withScope(ctx, () => {
    Sentry.captureException(normalizeException(err));
  });
}

function captureMessage(
  message: string,
  level: SeverityLevel = "error",
  ctx: SentryContext = {},
): void {
  if (!isEnabled()) {
    return;
  }

  withScope(ctx, () => {
    Sentry.captureMessage(message, level);
  });
}

function flush(timeoutMs = 2000): Promise<boolean> {
  if (!isEnabled()) {
    return Promise.resolve(true);
  }

  return Sentry.flush(timeoutMs).catch(() => false);
}

function buildInitOptions(): SentryInitOptions {
  return Object.assign(
    {},
    sentryConfig.dsn === undefined ? {} : { dsn: sentryConfig.dsn },
    sentryConfig.environment === undefined
      ? {}
      : { environment: sentryConfig.environment },
    sentryConfig.release === undefined ? {} : { release: sentryConfig.release },
    { tracesSampleRate: sentryConfig.tracesSampleRate },
  );
}

function init(): void {
  if (initAttempted) {
    return;
  }

  initAttempted = true;

  if (!sentryConfig.enabled || sentryConfig.dsn === undefined) {
    active = false;
    return;
  }

  try {
    Sentry.init(buildInitOptions());
    Sentry.addEventProcessor((event: Event) => sanitizeEvent(event));
    active = true;
  } catch (error) {
    active = false;
    console.warn("[Sentry] Failed to initialize; continuing without Sentry:", error);
  }
}

export const sentryService = {
  init,
  isEnabled,
  captureException,
  captureMessage,
  withScope,
  flush,
} as const;
