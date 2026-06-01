import process from "node:process";
import path from "node:path";
import { promises as fs } from "node:fs";
// import logger from '#vendor/utils/logger.js';
import appConfig from "#config/app.js";
// import cspConfig from "#config/csp.js";
import type sessionConfigType from "#config/session.js";
import type { HttpRequest, HttpResponse } from "#vendor/start/server.js";
import { MIME_TYPES } from "#vendor/constants/index.js";
import { isBinaryExtension } from "#vendor/utils/helpers/file-utils.js";
import logger from "#vendor/utils/logger.js";
import type { sessionHandler as sessionHandlerType } from "#vendor/utils/session/session-handler.js";
import type { resolveSessionCookie as resolveSessionCookieType } from "#vendor/utils/session/resolve-session-cookie.js";
import type { deleteLegacySessionCookie as deleteLegacySessionCookieType } from "#vendor/utils/session/delete-legacy-session-cookie.js";
import state from "#app/state/state.js";
import type { HttpData, ResponseData } from "#vendor/types/types.js";
import { parseCookies } from "#vendor/utils/network/http-request-handlers.js";
import { getHeaders } from "../utils/network/http-request-handlers.js";
import getIP from "#vendor/utils/network/get-ip.js";
import {
  setHeaders,
  setCookies,
  setSecurityHeaders,
  writeHttpStatus,
} from "#vendor/utils/network/http-response-handlers.js";
import { createResponseData } from "#vendor/utils/network/response-data.js";
import staticPageController from "#app/controllers/static/static-page-controller.js";
import contextHandler from "#vendor/utils/context/http-context.js";

type StaticSessionDependencies = {
  sessionConfig: typeof sessionConfigType;
  sessionHandler: typeof sessionHandlerType;
  resolveSessionCookie: typeof resolveSessionCookieType;
  deleteLegacySessionCookie: typeof deleteLegacySessionCookieType;
};

let staticSessionDependenciesPromise: Promise<StaticSessionDependencies> | null =
  null;

const getStaticSessionDependencies =
  async (): Promise<StaticSessionDependencies> => {
    staticSessionDependenciesPromise ??= Promise.all([
      import("#config/session.js"),
      import("#vendor/utils/session/session-handler.js"),
      import("#vendor/utils/session/resolve-session-cookie.js"),
      import("#vendor/utils/session/delete-legacy-session-cookie.js"),
    ])
      .then(
        ([
          sessionConfigModule,
          sessionHandlerModule,
          resolveSessionCookieModule,
          deleteLegacyModule,
        ]) => ({
          sessionConfig: sessionConfigModule.default,
          sessionHandler: sessionHandlerModule.sessionHandler,
          resolveSessionCookie: resolveSessionCookieModule.resolveSessionCookie,
          deleteLegacySessionCookie:
            deleteLegacyModule.deleteLegacySessionCookie,
        }),
      )
      .catch((err: unknown) => {
        staticSessionDependenciesPromise = null;
        throw err;
      });

    return staticSessionDependenciesPromise;
  };

const STATIC_PATH =
  appConfig.env === "manual-test"
    ? path.join(process.cwd(), "./public-test")
    : path.join(process.cwd(), "./public");

const ALLOWED_STATIC_EXTENSIONS = new Set([
  "html",
  "htm",
  "css",
  "js",
  "mjs",
  "webmanifest",
  "manifest",
  "json",
  "txt",
  "xml",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "ico",
  "bmp",
  "avif",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "mp3",
  "mp4",
  "webm",
  "ogg",
  "oga",
  "wav",
]);

const isUrlSafe = (url: string): boolean =>
  !url.includes("..") &&
  !url.includes("\0") &&
  !url.toLowerCase().includes("%2e%2e") &&
  !url.includes("%00");

const cache = new Map<string, string | Buffer>();

const cacheFile = async (filePath: string): Promise<void> => {
  const ext = path.extname(filePath).substring(1).toLowerCase();
  if (!ALLOWED_STATIC_EXTENSIONS.has(ext)) return;
  const isBinary = isBinaryExtension(ext);
  const data = await fs.readFile(filePath, isBinary ? null : "utf8");
  const key = filePath.substring(STATIC_PATH.length);
  cache.set(key, data);
};

const cacheDirectory = async (directoryPath: string): Promise<void> => {
  const files = await fs.readdir(directoryPath, { withFileTypes: true });
  for (const file of files) {
    if (file.name.startsWith(".")) continue;
    const filePath = path.join(directoryPath, file.name);
    if (file.isDirectory()) await cacheDirectory(filePath);
    else await cacheFile(filePath);
  }
};

const cacheStaticSource = async (): Promise<Map<
  string,
  string | Buffer
> | null> => {
  // logger.info('cachStaticSource');
  if (appConfig.serveStatic) {
    // logger.info('cache Directory ' + STATIC_PATH);
    await cacheDirectory(STATIC_PATH);
    // logger.info('Success cache Directory ' + STATIC_PATH);
    const indexHtml = cache.get("/index.html");
    if (indexHtml !== undefined && indexHtml !== "") {
      cache.set("/", indexHtml);
    }
    return cache;
  }
  return null;
};

// const buildCspValue = (): string => {
//   // Prefer full policy string if provided
//   // const policy: unknown = (cspConfig as any)?.policy ?? (cspConfig as any)?.value;
//   // if (typeof policy === 'string' && policy.trim().length > 0) return policy.trim();

//   const directives = cspConfig.directives;
//   if (typeof directives === "object") {
//     const parts: string[] = [];
//     for (const [name, val] of Object.entries(
//       directives as Record<string, unknown>,
//     )) {
//       if (Array.isArray(val)) {
//         parts.push(`${name} ${val.join(" ")}`.trim());
//       } else if (typeof val === "string") {
//         parts.push(`${name} ${val}`.trim());
//       } else if (val === true) {
//         parts.push(name);
//       }
//     }
//     return parts.join("; ").trim();
//   }
//   return "";
// };

// const cspHeaderValue: string = buildCspValue();
// const cspHeaderName: string = cspConfig.reportOnly
//   ? "Content-Security-Policy-Report-Only"
//   : "Content-Security-Policy";
// const isCspEnabled = Boolean(cspConfig.enabled && cspHeaderValue);

// const setCspHeader = (res: HttpResponse): void => {
//   if (!isCspEnabled) return;
//   res.writeHeader(cspHeaderName, cspHeaderValue);
// };

const staticIndexHandler = (res: HttpResponse): void => {
  const data = cache.get("/index.html");
  const statusCode = data !== undefined && data !== "" ? 200 : 404;
  const mimeType = MIME_TYPES["html"];
  res.cork(() => {
    writeHttpStatus(res, statusCode);
    // setCspHeader(res);
    if (mimeType !== undefined && mimeType !== "") {
      res.writeHeader("Content-Type", mimeType);
    }
    if (data !== undefined && data !== "") {
      res.end(data);
    } else {
      res.end("404 Not Found");
    }
  });
};

type StaticHttpData = Readonly<
  Omit<HttpData, "payload" | "params" | "contentType" | "isJson" | "query"> & {
    path: string;
    referer: string | undefined;
    /**
     * Static server uses raw URLSearchParams (no validator concept).
     * This intentionally diverges from `HttpData.query`, which is a typed
     * object validated by the route's `queryValidator` for API routes.
     */
    query: URLSearchParams;
  }
>;

const getStaticHttpData = (
  req: HttpRequest,
  res: HttpResponse,
): Readonly<StaticHttpData> => {
  const cookies = parseCookies(req.getHeader("cookie"));
  const url = req.getUrl();
  const query = new URLSearchParams(req.getQuery());
  const headers = getHeaders(req);
  // const ip = headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown';
  const ip = getIP(req, res);
  const referer = headers.get("referer");

  return {
    method: "get",
    ip,
    query,
    headers,
    cookies,
    path: url,
    referer: referer ?? undefined,
    files: null,
    hasFile: (): boolean => false,
  };
};

// Thin wrapper around the shared response-data builder.
const getResponseData = createResponseData;
const sendStaticResponse = (
  res: HttpResponse,
  responseData: ResponseData,
  htmlData: string | Buffer,
): void => {
  writeHttpStatus(res, responseData.status);
  // if (httpData.isJson) res.writeHeader('content-type', 'application/json');
  // setCspHeader(res);
  res.writeHeader("content-type", MIME_TYPES["html"] ?? "");
  setSecurityHeaders(res, responseData.headers);
  if (responseData.headers.length > 0) setHeaders(res, responseData.headers);
  if (responseData.cookies.size > 0) setCookies(res, responseData.cookies);
  res.end(htmlData);
};

const staticPageHandler = async (
  res: HttpResponse,
  req: HttpRequest,
  htmlData: string | Buffer,
): Promise<void> => {
  if (state["listenSocket"] !== undefined) {
    try {
      let aborted = false as boolean;
      res.onAborted(() => {
        aborted = true;
      });
      const httpData = getStaticHttpData(req, res);
      const responseData = getResponseData();
      responseData.payload = Buffer.isBuffer(htmlData)
        ? htmlData.toString("utf8")
        : htmlData;
      const sessionContext = contextHandler(
        httpData as unknown as HttpData,
        responseData,
      );
      const {
        sessionHandler,
        resolveSessionCookie,
        deleteLegacySessionCookie,
      } = await getStaticSessionDependencies();
      const { token, source } = resolveSessionCookie(httpData.cookies);
      if (source === "legacy") {
        deleteLegacySessionCookie(responseData);
      }
      await sessionHandler(sessionContext, token, undefined);

      const context = {
        httpData,
        responseData,
        sessionInfo: sessionContext.session.sessionInfo,
      };

      if (aborted) return;
      await staticPageController(context);

      res.cork(() => {
        const payload = responseData.payload;
        sendStaticResponse(
          res,
          responseData,
          typeof payload === "string" || Buffer.isBuffer(payload)
            ? payload
            : htmlData,
        );
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error({ err: error }, "Set Http Handler Error");
      res.cork(() => {
        writeHttpStatus(res, 500);
        res.end("500 Internal Server Error");
      });
    }
  } else {
    logger.warn("We just refuse if already shutting down");
    res.close();
  }
};

const staticCacheHandler = async (
  res: HttpResponse,
  req: HttpRequest,
  cachedData: string | Buffer,
): Promise<void> => {
  const url = req.getUrl();
  const ext = url.includes(".")
    ? path.extname(url).substring(1).toLowerCase()
    : "";

  const mimeType =
    ext !== ""
      ? (MIME_TYPES[ext] ?? MIME_TYPES["default"])
      : MIME_TYPES["html"];

  // Add cache headers for better performance
  const maxAge = 31536000; // 1 year in seconds
  const isHtml = mimeType === MIME_TYPES["html"];

  // Generate ETag based on content hash for better caching
  const dataLength = Buffer.isBuffer(cachedData)
    ? cachedData.length
    : Buffer.byteLength(cachedData, "utf8");
  const etag = `"${String(dataLength)}-${url.replace(/[^a-zA-Z0-9]/g, "")}"`;

  // Check if client has cached version
  const ifNoneMatch = req.getHeader("if-none-match");
  if (!isHtml && ifNoneMatch === etag) {
    // Cache hit - file not modified
    // logger.info(`Cache hit for ${url} - returning 304`);
    res.cork(() => {
      writeHttpStatus(res, 304);
      res.writeHeader(
        "Cache-Control",
        `public, max-age=${String(maxAge)}, immutable`,
      );
      res.writeHeader("ETag", etag);
      res.end();
    });
    return;
  }
  if (mimeType === MIME_TYPES["html"]) {
    await staticPageHandler(res, req, cachedData);
    return;
  }

  res.cork(() => {
    writeHttpStatus(res, 200);

    // Set appropriate headers
    if (mimeType !== undefined && mimeType !== "") {
      res.writeHeader("Content-Type", mimeType);
    }
    res.writeHeader("Content-Length", dataLength.toString());

    // For static assets, use longer cache time
    res.writeHeader(
      "Cache-Control",
      `public, max-age=${String(maxAge)}, immutable`,
    );
    res.writeHeader("ETag", etag);

    // Add security headers
    res.writeHeader("X-Content-Type-Options", "nosniff");

    // Note: Compression not implemented yet
    // When adding compression support, add: res.writeHeader('Vary', 'Accept-Encoding');

    res.end(cachedData);
  });
};

const staticHandler = async (
  res: HttpResponse,
  req: HttpRequest,
): Promise<void> => {
  const url = req.getUrl();

  if (!isUrlSafe(url)) {
    res.cork(() => {
      writeHttpStatus(res, 400);
      res.end("Bad Request");
    });
    return;
  }

  let data: string | Buffer | null = null;
  let statusCode = 404;
  let mimeType = "";

  if (!url.includes(".")) {
    const indexHtml = cache.get("/index.html");
    data = indexHtml ?? null;
    statusCode = indexHtml !== undefined && indexHtml !== "" ? 200 : 404;
    mimeType =
      indexHtml !== undefined && indexHtml !== ""
        ? (MIME_TYPES["html"] ?? "")
        : "";
    if (data !== null && statusCode === 200) {
      await staticPageHandler(res, req, data);
      return;
    }
  }

  res.cork(() => {
    writeHttpStatus(res, statusCode);
    res.writeHeader("Content-Type", mimeType);
    res.writeHeader("X-Content-Type-Options", "nosniff");
    res.end(data ?? "");
  });
};

export {
  cacheFile,
  cacheDirectory,
  cacheStaticSource,
  staticHandler,
  staticIndexHandler,
  staticCacheHandler,
};
