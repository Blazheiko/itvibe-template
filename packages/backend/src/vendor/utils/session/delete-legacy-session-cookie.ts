import sessionConfig from "#config/session.js";
import type { ResponseData } from "#vendor/types/types.js";

/**
 * Emit a `Set-Cookie` tombstone that removes the legacy session cookie from
 * the browser. Used by `__Host-` migration read sites when `resolveSessionCookie`
 * reports `source: 'legacy'`.
 *
 * Attributes (Path/Secure/SameSite) match the original cookie write in
 * `session-handler.ts`, otherwise the browser may refuse to overwrite.
 *
 * No-op when active and legacy names are equal (migration not active or
 * already rolled back).
 */
export const deleteLegacySessionCookie = (responseData: ResponseData): void => {
  if (sessionConfig.cookieName === sessionConfig.legacyCookieName) return;

  responseData.deleteCookie(sessionConfig.legacyCookieName, {
    path: sessionConfig.cookie.path,
    secure: sessionConfig.cookie.secure,
    sameSite: sessionConfig.cookie.sameSite,
  });
};
