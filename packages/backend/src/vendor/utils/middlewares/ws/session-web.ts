import type { HttpContext, Middleware } from "#vendor/types/types.js";
// import logger from '../../logger.js';
import { sessionHandler } from "#vendor/utils/session/session-handler.js";
import { resolveSessionCookie } from "#vendor/utils/session/resolve-session-cookie.js";
import { deleteLegacySessionCookie } from "#vendor/utils/session/delete-legacy-session-cookie.js";
import { getSessionCsrfToken } from "#vendor/utils/session/csrf-token.js";

/**
 * The CSRF token is not embedded in the cacheable HTML shell, so a guard that
 * short-circuits the chain has to hand it over itself. Without this an anonymous
 * visitor would be stuck: `main/init` is rejected by `auth_guard` with a 401, and
 * the login request it needs to sign is itself behind `csrf_guard`.
 *
 * This only touches payloads written by the middleware chain (401 from
 * `auth_guard`, 403 from `csrf_guard`, rate-limit rejections). Route handlers run
 * after the chain unwinds, so their responses are untouched and keep returning
 * the token explicitly where the contract promises it.
 */
const attachCsrfToken = (context: HttpContext): void => {
  const token = getSessionCsrfToken(context.session.sessionInfo);
  if (token === undefined) return;

  const payload = context.responseData.payload;
  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    Buffer.isBuffer(payload)
  ) {
    return;
  }

  // A payload that already carries a token (a rotation) wins.
  payload["csrfToken"] ??= token;
};

const sessionWeb: Middleware = async (
  context: HttpContext,
  next: () => Promise<void>,
): Promise<void> => {
  const { httpData, responseData } = context;
  const { token, source } = resolveSessionCookie(httpData.cookies);
  if (source === "legacy") {
    deleteLegacySessionCookie(responseData);
  }
  await sessionHandler(context, token, undefined);

  await next();

  attachCsrfToken(context);
};

export default sessionWeb;
