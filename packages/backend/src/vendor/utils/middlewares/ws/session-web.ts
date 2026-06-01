import type { HttpContext, Middleware } from "#vendor/types/types.js";
// import logger from '../../logger.js';
import { sessionHandler } from "#vendor/utils/session/session-handler.js";
import { resolveSessionCookie } from "#vendor/utils/session/resolve-session-cookie.js";
import { deleteLegacySessionCookie } from "#vendor/utils/session/delete-legacy-session-cookie.js";

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
};

export default sessionWeb;
