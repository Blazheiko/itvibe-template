import * as uWS from "uWebSockets.js";
import type {
  HttpRequest,
  HttpResponse,
  WebSocket,
  TemplatedApp,
} from "uWebSockets.js";
import appConfig from "#config/app.js";
import corsConfig from "#config/cors.js";
import state from "#app/state/state.js";
import { createResponseData } from "#vendor/utils/network/response-data.js";
import {
  onMessage,
  onOpen,
  onClose,
  handleUpgrade,
  closeAllWs,
} from "#vendor/utils/network/ws-handlers.js";
import {
  getHeaders,
  getData,
  extractParameters,
  normalizePath,
  parseCookies,
  detectBodyKind,
  resolveMaxBodySize,
  type BodyKind,
  type RequestAbortSignal,
} from "../utils/network/http-request-handlers.js";
import { ParameterValidationError } from "#app/validate/checkers/parameter-checker.js";
import { ValidationError } from "#app/validate/errors/validation-error.js";
import { PayloadTooLargeError } from "#vendor/utils/network/errors/payload-too-large-error.js";
import { UnsupportedMediaTypeError } from "#vendor/utils/network/errors/unsupported-media-type-error.js";
import logger from "#vendor/utils/logger.js";
import {
  setHeaders,
  setCookies,
  setSecurityHeaders,
  writeHttpStatus,
} from "#vendor/utils/network/http-response-handlers.js";
import executeMiddlewares from "#vendor/utils/middlewares/core/execute-httpMiddlewares.js";
import checkRateLimit from "#vendor/utils/rate-limit/http-rate-limit.js";
import type {
  HttpData,
  MyWebSocket,
  ResponseData,
  RouteItem,
  Payload,
  UploadedFile,
  routeList,
  WsRoutes,
} from "#vendor/types/types.js";
import contextHandler from "../utils/context/http-context.js";
import {
  cacheStaticSource,
  staticHandler,
  staticCacheHandler,
} from "#vendor/start/static-server.js";
import configApp from "#config/app.js";
// import schemas from "#app/validate/schemas/schemas.js";
import getIP from "#vendor/utils/network/get-ip.js";
import { serializeRoutes } from "#vendor/utils/routing/serialize-routes.js";
import {
  makeBroadcastJson,
  makeJson,
} from "#vendor/utils/helpers/json-handlers.js";
import { validateRoutePayload } from "#vendor/utils/validation/validate-route-payload.js";
import { flattenQuery } from "#vendor/utils/validation/flatten-query.js";
import * as console from "node:console";

export type {
  HttpRequest,
  HttpResponse,
  us_socket_context_t,
  us_listen_socket,
  WebSocket,
  TemplatedApp,
  CompressOptions,
} from "uWebSockets.js";

export type UserData = Record<string, unknown>;
const server: TemplatedApp = uWS.App();

interface ServerRoutes {
  httpRoutes: RouteItem[];
  wsRoutesByUrl: Readonly<WsRoutes>;
  sourceHttpRoutes: routeList;
  sourceWsRoutes: routeList;
}

const broadcastToChannel = (
  channel: string,
  event: string,
  payload: Payload,
): void => {
  server.publish(channel, makeBroadcastJson(event, 200, payload));
};

const configureWebsockets = (
  server: TemplatedApp,
  wsRoutesByUrl: Readonly<WsRoutes>,
): TemplatedApp => {
  return server.ws(`/${appConfig.pathPrefix}/websocket`, {
    compression: 0,
    idleTimeout: 120, // According to protocol
    maxPayloadLength: 1 * 1024 * 1024,
    maxBackpressure: 64 * 1024,
    open: (ws: WebSocket<Record<string, unknown>>): void => {
      onOpen(ws as MyWebSocket);
    },
    message: (
      ws: WebSocket<Record<string, unknown>>,
      message: ArrayBuffer,
      isBinary: boolean,
    ) => onMessage(ws as MyWebSocket, message, isBinary, wsRoutesByUrl),
    // upgrade: async (res: HttpResponse, req: HttpRequest, context: us_socket_context_t) => {
    //    await handleUpgrade(res, req, context);
    // },
    upgrade: handleUpgrade,
    // drain: (ws) => handleDrain(ws),
    close: (
      ws: WebSocket<Record<string, unknown>>,
      code: number,
      message: ArrayBuffer,
    ): void => {
      onClose(ws as MyWebSocket, code, message).catch((error: unknown) => {
        console.error(error);
      });
    },
  });
};

// CSP header is applied from staticServer for HTML responses
// getResponseData is now a thin wrapper around the shared response-data builder.
const getResponseData = createResponseData;

interface RequestMetadata {
  ip: string;
  cookies: Map<string, string>;
  query: URLSearchParams;
  headers: Map<string, string>;
  params: Record<string, string>;
  contentType: string | undefined;
  bodyKind: BodyKind;
  hasBody: boolean;
}

// uWS `req` is only valid until the first `await`. Collect everything
// synchronously here so rate-limit (and any other pre-body checks) can run
// against a detached snapshot.
const collectRequestMetadata = (
  req: HttpRequest,
  res: HttpResponse,
  route: RouteItem,
): RequestMetadata => {
  const cookies: Map<string, string> = parseCookies(req.getHeader("cookie"));
  const query = new URLSearchParams(req.getQuery());
  const headers = getHeaders(req);
  const params: Record<string, string> =
    route.parametersKey !== undefined && route.parametersKey.length > 0
      ? extractParameters(route.parametersKey, req)
      : {};
  const contentType = headers.get("content-type");
  const ip = getIP(req, res);
  const hasBody = route.method === "post" || route.method === "put";
  const bodyKind: BodyKind =
    contentType !== undefined ? detectBodyKind(contentType) : "other";

  return {
    ip,
    cookies,
    query,
    headers,
    params,
    contentType,
    bodyKind,
    hasBody,
  };
};

/**
 * Validates the query string when the route declares a `queryValidator`.
 * Runs after rate-limit and before body parsing — so middleware and the
 * handler always see either a typed object (validator present) or `null`
 * (validator absent), never a raw `URLSearchParams`.
 */
export const validateQuery = (
  meta: RequestMetadata,
  route: RouteItem,
): unknown => {
  if (route.queryValidator === undefined) {
    return null;
  }
  const arrayKeys = new Set<string>(route.queryArrays ?? []);
  const flattened = flattenQuery(meta.query, arrayKeys);
  return validateRoutePayload(route.queryValidator, flattened);
};

export const readAndParseBody = async (
  res: HttpResponse,
  meta: RequestMetadata,
  route: RouteItem,
  abortSignal: RequestAbortSignal,
): Promise<{
  payload: Payload | null;
  files: Map<string, UploadedFile> | null;
}> => {
  if (!meta.hasBody || meta.contentType === undefined) {
    return { payload: null, files: null };
  }

  const allowed: BodyKind[] = route.allowedContentTypes ?? ["json"];
  if (!allowed.includes(meta.bodyKind)) {
    logger.warn(
      {
        routeUrl: route.url,
        routeMethod: route.method,
        receivedContentType: meta.contentType,
        allowed,
      },
      "Content-type rejected — add allowedContentTypes to this route if multipart is intentional",
    );
    throw new UnsupportedMediaTypeError(meta.contentType, allowed);
  }

  const limit = resolveMaxBodySize(meta.bodyKind);
  const rawContentLength = meta.headers.get("content-length");
  const declared =
    rawContentLength !== undefined && /^\d+$/.test(rawContentLength)
      ? Number(rawContentLength)
      : null;
  if (declared !== null && declared > limit) {
    throw new PayloadTooLargeError(limit, meta.contentType);
  }

  const result = await getData(
    res,
    meta.contentType,
    meta.headers,
    limit,
    abortSignal,
  );

  if (route.validator !== undefined && result.payload !== null) {
    return {
      payload: validateRoutePayload(route.validator, result.payload) as Payload,
      files: result.files,
    };
  }

  return { payload: null, files: result.files };
};

const sendResponse = (
  res: HttpResponse,
  responseData: ResponseData,
  requestOrigin: string | undefined,
): void => {
  const isRedirect = responseData.status >= 300 && responseData.status < 400;
  writeHttpStatus(res, responseData.status);
  if (!isRedirect) {
    res.writeHeader("content-type", "application/json");
  }
  setSecurityHeaders(res, responseData.headers);
  if (responseData.headers.length > 0) setHeaders(res, responseData.headers);
  if (responseData.cookies.size > 0) setCookies(res, responseData.cookies);
  if (corsConfig.enabled) setCorsHeader(res, requestOrigin);
  if (isRedirect) {
    res.end();
  } else if (responseData.payload !== null) {
    res.end(makeJson(responseData.payload));
  } else res.end(String(responseData.status));
};

type CanonicalErrorBody = {
  status: "error";
  code: string;
  message: string;
  details?: unknown;
  reason?: string;
};

const sendErrorResponse = (
  res: HttpResponse,
  status: number,
  body: CanonicalErrorBody,
): void => {
  res.cork(() => {
    writeHttpStatus(res, status);
    setSecurityHeaders(res);
    res.writeHeader("content-type", "application/json");
    res.end(makeJson(body));
  });
};

// interface State {
//   listenSocket: us_listen_socket | null;
// }

type HttpSentryContext = {
  requestId?: string | undefined;
  userId?: string | undefined;
  route?: string | undefined;
  method?: string | undefined;
};

export const handleError = (
  res: HttpResponse,
  error: unknown,
  sentryContext?: HttpSentryContext,
): void => {
  if (error instanceof PayloadTooLargeError) {
    logger.warn(
      { limit: error.limit, contentType: error.contentType },
      "Payload too large",
    );
    sendErrorResponse(res, error.statusCode, {
      status: "error",
      code: error.code,
      message: "Payload too large",
      details: {
        kind: "payload_too_large",
        limit: error.limit,
        contentType: error.contentType,
      },
    });
  } else if (error instanceof UnsupportedMediaTypeError) {
    logger.warn(
      {
        receivedContentType: error.receivedContentType,
        allowedKinds: error.allowedKinds,
      },
      "Unsupported media type",
    );
    sendErrorResponse(res, error.statusCode, {
      status: "error",
      code: error.code,
      message: "Unsupported Media Type",
      details: {
        kind: "unsupported_media_type",
        receivedContentType: error.receivedContentType,
        allowedKinds: error.allowedKinds,
      },
    });
  } else if (error instanceof ValidationError) {
    logger.warn({ err: error }, "Handle Error");
    sendErrorResponse(res, error.statusCode, {
      status: "error",
      code: error.code,
      message: "Validation failure",
      details: {
        kind: "validation",
        messages: error.messages,
      },
    });
  } else if (error instanceof ParameterValidationError) {
    logger.warn({ err: error }, "Handle Error");
    sendErrorResponse(res, error.statusCode, {
      status: "error",
      code: error.code,
      message: "Invalid parameter",
      details: {
        kind: "parameter_validation",
        parameter: error.parameterName,
        messages: [error.message],
      },
    });
  } else {
    logger.error({ err: error, ...sentryContext }, "Handle Error");
    const errorMessage =
      configApp.env === "local" ? String(error) : "Internal server error";
    sendErrorResponse(res, 500, {
      status: "error",
      code: "internal_error",
      message: errorMessage,
    });
  }
};

const docRoutesHandler = async (
  res: HttpResponse,
  req: HttpRequest,
  routes: ServerRoutes,
): Promise<void> => {
  return new Promise((resolve: () => void) => {
    if (
      state["listenSocket"] !== undefined &&
      configApp.env === "manual-test" &&
      configApp.docPage &&
      configApp.serveStatic
    ) {
      try {
        const serializedHttpRoutes = serializeRoutes(routes.sourceHttpRoutes);
        const serializedWsRoutes = serializeRoutes(routes.sourceWsRoutes);

        res.cork(() => {
          writeHttpStatus(res, 200);
          res.writeHeader("content-type", "application/json");
          res.end(
            makeJson({
              httpRoutes: serializedHttpRoutes,
              wsRoutes: serializedWsRoutes,
              pathPrefix: appConfig.pathPrefix,
            }),
          );
        });
      } catch (err: unknown) {
        res.cork(() => {
          handleError(res, err, {
            route: req.getUrl(),
            method: req.getMethod(),
          });
        });
      }
    } else {
      sendErrorResponse(res, 404, {
        status: "error",
        code: "not_found",
        message: "Not found",
      });
    }
    resolve();
  });
};

const setHttpHandler = async (
  res: HttpResponse,
  req: HttpRequest,
  route: RouteItem,
): Promise<void> => {
  if (state["listenSocket"] === undefined) {
    logger.warn("We just refuse if already shutting down");
    res.close();
    return;
  }

  // Single onAborted registration — uWS res.onAborted() is a single slot,
  // re-registering replaces the previous handler. We wire readData via
  // RequestAbortSignal instead of calling res.onAborted() a second time.
  const abortSignal: RequestAbortSignal = { aborted: false };
  res.onAborted(() => {
    abortSignal.aborted = true;
    abortSignal.onAbort?.();
  });
  const responseData = getResponseData();
  let origin: string | undefined;
  let requestId: string | undefined;
  let userId: string | undefined;

  try {
    // Step 1: snapshot req synchronously — it is only valid until the first await.
    const meta = collectRequestMetadata(req, res, route);
    origin = meta.headers.get("origin");

    // Step 2: rate-limit BEFORE reading body. Otherwise an attacker can make
    // the server buffer and parse up to maxOctetStreamBodySize even on blocked
    // routes, which is a DoS vector.
    //
    // Sync by design: если здесь будет `await`, uWS может доставить тело
    // маленьких POST-запросов до того, как readData зарегистрирует
    // res.onData(), и хендлер навсегда зависнет в pending.
    const rateLimitPassed = checkRateLimit(
      meta.ip,
      responseData,
      route,
      route.groupRateLimit,
    );

    if (!rateLimitPassed) {
      if (abortSignal.aborted) return;
      res.cork(() => {
        sendResponse(res, responseData, origin);
      });
      return;
    }

    // Step 3: validate query. Done before body so we don't waste IO/parse
    // budget on an already-invalid query, and so middleware sees a typed
    // object on routes with a queryValidator. When the route has no
    // queryValidator, this returns null — handlers must opt in to query
    // by declaring a schema.
    const validatedQuery = validateQuery(meta, route);

    // Step 4: now that the client is not rate-limited and the query is
    // validated, read and parse the body.
    const { payload, files } = await readAndParseBody(
      res,
      meta,
      route,
      abortSignal,
    );

    // Step 5: middleware chain + handler.
    const httpData: HttpData = {
      method: route.method,
      ip: meta.ip,
      params: meta.params,
      payload,
      query: validatedQuery as HttpData["query"],
      headers: meta.headers,
      contentType: meta.contentType,
      cookies: meta.cookies,
      isJson: meta.hasBody && meta.bodyKind === "json",
      files,
      hasFile: (name: string): boolean => files?.has(name) ?? false,
    };
    const context = contextHandler(httpData, responseData);
    requestId = context.requestId;
    userId = context.auth.getUserId() ?? undefined;

    if (
      (route.middlewares?.length === 0 ||
        (await executeMiddlewares(route.middlewares, context))) &&
      responseData.status >= 200 &&
      responseData.status < 300
    )
      responseData.payload = await route.handler(context);

    if (abortSignal.aborted) return;

    res.cork(() => {
      sendResponse(res, responseData, origin);
    });
  } catch (err: unknown) {
    if (abortSignal.aborted) return;
    res.cork(() => {
      handleError(res, err, {
        requestId,
        userId,
        route: route.url,
        method: route.method,
      });
    });
  }
};

const configureHttp = async (
  server: TemplatedApp,
  routes: ServerRoutes,
): Promise<void> => {
  if (appConfig.serveStatic) {
    const staticCache = await cacheStaticSource();
    if (staticCache !== null) {
      staticCache.forEach((value, key) => {
        server.get(key, async (res, req) => {
          await staticCacheHandler(res, req, value);
        });
      });
    }
  }

  routes.httpRoutes.forEach((route: RouteItem) => {
    registerHttpRoute(server, route);
  });
  if (
    configApp.env === "manual-test" &&
    configApp.docPage &&
    configApp.serveStatic
  ) {
    server.get(`/${appConfig.pathPrefix}/doc/routes`, async (res, req) => {
      await docRoutesHandler(res, req, routes);
    });
  }

  server.any("/*", (res: HttpResponse, req: HttpRequest): void => {
    const url = req.getUrl();
    const method = req.getMethod();
    const origin = req.getHeader("origin");
    if (corsConfig.enabled && method === "options") {
      //'OPTIONS' method === 'OPTIONS'
      res.cork(() => {
        setCorsHeader(res, origin);
        writeHttpStatus(res, 200);
        res.end();
      });
    } else if (
      url.startsWith(`/${appConfig.pathPrefix}/`) &&
      method !== "options"
    ) {
      sendErrorResponse(res, 404, {
        status: "error",
        code: "not_found",
        message: "Route not found",
      });
    } else if (appConfig.serveStatic && method === "get") {
      void staticHandler(res, req).catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error({ err: error, url }, "Unhandled static handler error");
      });
    } else {
      sendErrorResponse(res, 404, {
        status: "error",
        code: "not_found",
        message: "Not found",
      });
    }
  });
};

const registerHttpRoute = (server: TemplatedApp, route: RouteItem): void => {
  const path = `/${normalizePath(route.url)}`;
  const handler = async (
    res: HttpResponse,
    req: HttpRequest,
  ): Promise<void> => {
    await setHttpHandler(res, req, route);
  };

  switch (route.method) {
    case "get":
      server.get(path, handler);
      return;
    case "post":
      server.post(path, handler);
      return;
    case "put":
      server.put(path, handler);
      return;
    case "patch":
      server.patch(path, handler);
      return;
    case "del":
      server.del(path, handler);
      return;
    default:
      throw new Error(`Unsupported HTTP route method: ${route.method}`);
  }
};

const resolveAllowedOrigin = (
  requestOrigin: string | undefined,
): string | null => {
  if (requestOrigin === undefined || requestOrigin === "") return null;
  return corsConfig.allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : null;
};

const setCorsHeader = (
  res: HttpResponse,
  requestOrigin: string | undefined,
): void => {
  // Vary: Origin prevents intermediate caches from serving a CORS response
  // to an origin other than the one it was computed for.
  res.writeHeader("Vary", "Origin");
  const allowed = resolveAllowedOrigin(requestOrigin);
  if (allowed === null) return;
  res.writeHeader("Access-Control-Allow-Origin", allowed);
  res.writeHeader("Access-Control-Allow-Methods", corsConfig.methods);
  res.writeHeader("Access-Control-Max-Age", String(corsConfig.maxAge));
  res.writeHeader("Access-Control-Expose-Headers", corsConfig.exposeHeaders);
  res.writeHeader("Access-Control-Allow-Headers", corsConfig.allowHeaders);
  if (corsConfig.credentials) {
    res.writeHeader("Access-Control-Allow-Credentials", "true");
  }
};
// let server = null;
const initServer = async (routes: ServerRoutes): Promise<void> => {
  configureWebsockets(server, routes.wsRoutesByUrl);
  await configureHttp(server, routes);
  if (appConfig.unixPath !== undefined) {
    server.listen_unix((token) => {
      logger.info(`Listening unix socket: ${appConfig.unixPath ?? ""}`);
      state["listenSocket"] = token;
    }, appConfig.unixPath);
  } else {
    server.listen(
      appConfig.host,
      appConfig.port,
      (token) => {
        if (token !== false) {
          logger.info(
            `Listening http://${appConfig.host}:${String(appConfig.port)}`,
          );
          state["listenSocket"] = token;
        } else {
          logger.error(`Failed to listen to port ${String(appConfig.port)}`);
        }
      },
    );
  }
};

const stopServer = async (type = "handle"): Promise<void> => {
  logger.info(`server stop type: ${type}`);
  try {
    await closeAllWs();
    if (state["listenSocket"] !== undefined) {
      uWS.us_listen_socket_close(state["listenSocket"] as uWS.us_listen_socket);
    }
    state["listenSocket"] = undefined;
  } catch (error) {
    console.error(error);
  }
};

export { initServer, stopServer, broadcastToChannel };
