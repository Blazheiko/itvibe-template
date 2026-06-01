import type {
  HttpData,
  ResponseData,
  SessionInfo,
} from "#vendor/types/types.js";
import {
  getSessionCsrfToken,
  isValidCsrfToken,
} from "#vendor/utils/session/csrf-token.js";
import logger from "#vendor/utils/logger.js";

type StaticHttpData = Readonly<
  Omit<HttpData, "payload" | "params" | "contentType" | "isJson" | "query"> & {
    path: string;
    referer: string | undefined;
    /** Static-page server uses raw URLSearchParams (no query validator). */
    query: URLSearchParams;
  }
>;

interface StaticPageContext {
  httpData: StaticHttpData;
  responseData: ResponseData;
  sessionInfo: SessionInfo | null;
}

const CSRF_PLACEHOLDER = "__CSRF_TOKEN__";

const escapeHtmlAttribute = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const injectCsrfToken = (html: string, token: string): string => {
  if (!html.includes(CSRF_PLACEHOLDER)) {
    logger.error(
      { placeholder: CSRF_PLACEHOLDER },
      "CSRF placeholder is missing from static HTML template",
    );
    return html;
  }

  return html.replaceAll(CSRF_PLACEHOLDER, escapeHtmlAttribute(token));
};

const staticPageController = async (
  context: StaticPageContext,
): Promise<void> => {
  const token = getSessionCsrfToken(context.sessionInfo);
  const payload = context.responseData.payload;
  if (!isValidCsrfToken(token) || typeof payload !== "string") {
    return;
  }

  context.responseData.payload = injectCsrfToken(payload, token);
  context.responseData.setHeader("Cache-Control", "private, no-store");
};

export default staticPageController;
