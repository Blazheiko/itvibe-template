import { timingSafeEqual } from "node:crypto";

import csrfConfig from "#config/csrf.js";
import type { HttpContext, Method, Middleware } from "#vendor/types/types.js";
import { isValidCsrfToken } from "#vendor/utils/session/csrf-token.js";

const UNSAFE_METHODS = new Set<Method | string>([
  "post",
  "put",
  "patch",
  "delete",
  "del",
]);

const normalizeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const isAllowedOrigin = (origin: string): boolean =>
  csrfConfig.allowedOrigins.length === 0 ||
  csrfConfig.allowedOrigins.includes(origin);

const hasOriginViolation = (context: HttpContext): boolean => {
  const origin = context.httpData.headers.get("origin");
  if (origin !== undefined && origin !== "") {
    return !isAllowedOrigin(origin);
  }

  const referer = context.httpData.headers.get("referer");
  if (referer !== undefined && referer !== "") {
    const refererOrigin = normalizeOrigin(referer);
    return refererOrigin === null || !isAllowedOrigin(refererOrigin);
  }

  return csrfConfig.strictOrigin;
};

const safeTokenEqual = (
  expected: string | undefined,
  submitted: string | undefined,
): boolean => {
  if (!isValidCsrfToken(expected) || !isValidCsrfToken(submitted)) {
    return false;
  }
  const expectedBuffer = Buffer.from(expected);
  const submittedBuffer = Buffer.from(submitted);
  if (expectedBuffer.length !== submittedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, submittedBuffer);
};

const shouldContinueAfterViolation = (
  context: HttpContext,
  reason: "origin_mismatch" | "token_mismatch",
): boolean => {
  context.logger.warn(
    {
      reason,
      method: context.httpData.method,
      originPresent: context.httpData.headers.has("origin"),
      refererPresent: context.httpData.headers.has("referer"),
      hasSession: context.session.sessionInfo !== null,
      hasUser: context.auth.check(),
      csrfEnforce: csrfConfig.enforce,
    },
    "CSRF validation failed",
  );

  if (!csrfConfig.enforce) {
    return true;
  }

  context.responseData.status = 403;
  context.responseData.payload = {
    status: "error",
    code: "csrf_invalid",
    message: "Invalid CSRF token",
    reason,
  };
  return false;
};

const csrfGuard: Middleware = async (
  context: HttpContext,
  next: () => Promise<void>,
): Promise<void> => {
  if (!UNSAFE_METHODS.has(context.httpData.method)) {
    await next();
    return;
  }

  if (context.session.sessionInfo === null) {
    await next();
    return;
  }

  if (hasOriginViolation(context)) {
    if (!shouldContinueAfterViolation(context, "origin_mismatch")) return;
  }

  const expectedToken = context.session.sessionInfo.data.csrfToken;
  const submittedToken = context.httpData.headers.get(csrfConfig.headerName);
  if (!safeTokenEqual(expectedToken, submittedToken)) {
    if (!shouldContinueAfterViolation(context, "token_mismatch")) return;
  }

  await next();
};

export default csrfGuard;
