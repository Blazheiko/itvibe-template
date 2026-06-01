import sessionConfig from "#config/session.js";
import logger from "#vendor/utils/logger.js";

export type ResolvedSessionCookie = {
  token: string | undefined;
  source: "active" | "legacy" | "none";
};

/**
 * Resolve the session cookie value from a cookie map, supporting a migration
 * window where some clients still hold the legacy cookie name.
 *
 * - prefers the active cookie name (`sessionConfig.cookieName`)
 * - falls back to `sessionConfig.legacyCookieName` if active is absent
 * - emits a structured log when only the legacy cookie is present so the
 *   migration team can decide when to remove the fallback path
 */
export const resolveSessionCookie = (
  cookies: Map<string, string>,
): ResolvedSessionCookie => {
  const active = cookies.get(sessionConfig.cookieName);
  if (active !== undefined) {
    return { token: active, source: "active" };
  }

  if (sessionConfig.cookieName !== sessionConfig.legacyCookieName) {
    const legacy = cookies.get(sessionConfig.legacyCookieName);
    if (legacy !== undefined) {
      logger.info({ cookie: "legacy" }, "Read session from legacy cookie name");
      return { token: legacy, source: "legacy" };
    }
  }

  return { token: undefined, source: "none" };
};
