import process from "node:process";
import path from "node:path";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
// import logger from '#vendor/utils/logger.js';
import appConfig from "#config/app.js";
import type { HttpRequest, HttpResponse } from "#vendor/start/server.js";
import { MIME_TYPES } from "#vendor/constants/index.js";
import { isBinaryExtension } from "#vendor/utils/helpers/file-utils.js";
import type { CspKind } from "#vendor/utils/network/csp.js";
import {
  setSecurityHeaders,
  writeHttpStatus,
} from "#vendor/utils/network/http-response-handlers.js";

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

/**
 * Validators must be derived from content, not from byte length: a rebuild
 * typically changes only the fixed-length asset hashes inside `index.html`, so a
 * length-based ETag would keep validating an obsolete app shell and a client
 * would hold on to a shell referencing assets the new deployment no longer has.
 * Files are read once at startup, so each hash is computed once too.
 */
const etags = new Map<string, string>();

const computeEtag = (data: string | Buffer): string =>
  `"${crypto.createHash("sha1").update(data).digest("base64url")}"`;

const getEtag = (key: string, data: string | Buffer): string =>
  etags.get(key) ?? computeEtag(data);

const cacheFile = async (filePath: string): Promise<void> => {
  const ext = path.extname(filePath).substring(1).toLowerCase();
  if (!ALLOWED_STATIC_EXTENSIONS.has(ext)) return;
  const isBinary = isBinaryExtension(ext);
  const data = await fs.readFile(filePath, isBinary ? null : "utf8");
  const key = filePath.substring(STATIC_PATH.length);
  cache.set(key, data);
  etags.set(key, computeEtag(data));
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
      etags.set("/", getEtag("/index.html", indexHtml));
    }
    return cache;
  }
  return null;
};

// The service worker script's own CSP would govern the worker (and its fetches), so it gets none.
const SERVICE_WORKER_PATH = "/service-worker.js";

const getAssetCspKind = (url: string, ext: string): CspKind | null => {
  if (url === SERVICE_WORKER_PATH) return null;
  return ext === "svg" ? "svg" : null;
};

const staticIndexHandler = (res: HttpResponse): void => {
  const data = cache.get("/index.html");
  const statusCode = data !== undefined && data !== "" ? 200 : 404;
  const mimeType = MIME_TYPES["html"];
  res.cork(() => {
    writeHttpStatus(res, statusCode);
    setSecurityHeaders(res, [], statusCode === 200 ? "document" : "strict");
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

/**
 * The SPA shell is served as a plain cacheable static file: no session is
 * created and nothing is injected per request. The session cookie and the
 * CSRF token are issued by the API on app initialization.
 */
const HTML_CACHE_CONTROL = "public, max-age=0, must-revalidate";

const handleHtmlRequest = (
  res: HttpResponse,
  req: HttpRequest,
  htmlData: string | Buffer,
  etag: string,
): void => {
  const ifNoneMatch = req.getHeader("if-none-match");

  res.cork(() => {
    const notModified = ifNoneMatch === etag;
    writeHttpStatus(res, notModified ? 304 : 200);
    res.writeHeader("content-type", MIME_TYPES["html"] ?? "");
    res.writeHeader("Cache-Control", HTML_CACHE_CONTROL);
    res.writeHeader("ETag", etag);
    setSecurityHeaders(res, [], "document");
    if (notModified) {
      res.end();
      return;
    }
    res.end(htmlData);
  });
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

  const etag = getEtag(url, cachedData);
  const cspKind = getAssetCspKind(url, ext);

  if (mimeType === MIME_TYPES["html"]) {
    handleHtmlRequest(res, req, cachedData, etag);
    return;
  }

  // Add cache headers for better performance
  const maxAge = 31536000; // 1 year in seconds

  const dataLength = Buffer.isBuffer(cachedData)
    ? cachedData.length
    : Buffer.byteLength(cachedData, "utf8");

  // Check if client has cached version
  const ifNoneMatch = req.getHeader("if-none-match");
  if (ifNoneMatch === etag) {
    // Cache hit - file not modified
    // logger.info(`Cache hit for ${url} - returning 304`);
    res.cork(() => {
      writeHttpStatus(res, 304);
      res.writeHeader(
        "Cache-Control",
        `public, max-age=${String(maxAge)}, immutable`,
      );
      res.writeHeader("ETag", etag);
      setSecurityHeaders(res, [], cspKind);
      res.end();
    });
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

    setSecurityHeaders(res, [], cspKind);

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
      setSecurityHeaders(res);
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
      handleHtmlRequest(res, req, data, getEtag("/index.html", data));
      return;
    }
  }

  res.cork(() => {
    writeHttpStatus(res, statusCode);
    res.writeHeader("Content-Type", mimeType);
    setSecurityHeaders(res);
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
