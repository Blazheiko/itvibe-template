import crypto from "node:crypto";
import type { SessionInfo } from "#vendor/types/types.js";

export const generateCsrfToken = (): string =>
  crypto.randomBytes(32).toString("base64url");

export const isValidCsrfToken = (token: unknown): token is string => {
  if (typeof token !== "string") return false;
  if (token.length < 32 || token.length > 128) return false;
  return /^[A-Za-z0-9_-]+$/.test(token);
};

export const getSessionCsrfToken = (
  sessionInfo: SessionInfo | null | undefined,
): string | undefined => {
  const token = sessionInfo?.data.csrfToken;
  return isValidCsrfToken(token) ? token : undefined;
};
