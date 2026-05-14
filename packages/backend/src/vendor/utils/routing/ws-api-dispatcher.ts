import { getWsRoute } from "#vendor/start/router.js";
import executeMiddlewares from "#vendor/utils/middlewares/core/execute-httpMiddlewares.js";
// import validators from '#vendor/start/validators.js';
import type {
  Session,
  WsData,
  WsMessage,
  WsResponseData,
  MyWebSocket,
  UserConnection,
  // ValidatorFunction,
  HttpContext,
  Payload,
} from "#vendor/types/types.js";
import createWsContext from "../context/ws-context.js";
import checkRateLimitWs, {
  createWsRateLimitErrorResponse,
} from "../rate-limit/ws-rate-limit.js";
import { ValidationError } from "#app/validate/errors/validation-error.js";
import { validateRoutePayload } from "#vendor/utils/validation/validate-route-payload.js";
import logger from "#vendor/utils/logger.js";

type WsErrorEnvelope = NonNullable<WsResponseData["error"]>;

const createWsErrorEnvelope = (
  code: string,
  message: string,
  options?: { reason?: string; details?: unknown },
): WsErrorEnvelope => ({
  code,
  message,
  ...(options?.reason !== undefined ? { reason: options.reason } : {}),
  ...(options?.details !== undefined ? { details: options.details } : {}),
});

export default async (
  message: WsMessage,
  ws: MyWebSocket,
  userData: UserConnection,
  session: Session,
): Promise<WsResponseData | null> => {
  const responseData: WsResponseData = {
    data: {},
    event: message.event,
    timestamp: message.timestamp,
    status: "200",
    error: null,
  };
  let requestId: string | undefined;
  let userId: string | undefined;
  let routePath: string | undefined;
  try {
    const event = message.event;
    const nameRoute = event.split(":")[0];
    if (nameRoute === undefined) {
      throw new Error("Invalid event");
    }
    const route = getWsRoute(nameRoute);
    if (route !== undefined) {
      routePath = route.url;
      // Check rate limit before processing
      const rateLimitResult = checkRateLimitWs(ws, route, route.groupRateLimit);

      if (!rateLimitResult.allowed) {
        // Rate limit exceeded - return error response
        return createWsRateLimitErrorResponse(
          rateLimitResult.errorMessage ?? "Rate limit exceeded",
          rateLimitResult.retryAfter ?? 60,
          message.event,
        );
      }

      const rawPayload = (message as { payload?: unknown }).payload;
      let payload: Payload | null = (rawPayload as Payload | null) ?? null;
      if (route.validator !== undefined) {
        payload = validateRoutePayload(route.validator, rawPayload) as Payload;
      }
      const wsData: WsData = {
        ws,
        middlewareData: { userData },
        status: "200",
        payload:
          payload !== null &&
          typeof payload === "object" &&
          !Buffer.isBuffer(payload)
            ? (Object.freeze({ ...payload }) as Payload)
            : ((payload ?? {}) as Payload),
      };

      // const context = { wsData, responseData , session : null , auth: null};
      const context = createWsContext(wsData, responseData, session);
      requestId = context.requestId;
      userId = userData.userId;
      if (
        route.middlewares === undefined ||
        !Array.isArray(route.middlewares) ||
        route.middlewares.length === 0 ||
        (await executeMiddlewares(
          route.middlewares,
          context as unknown as HttpContext,
        ))
      ) {
        const handler = route.handler;
        responseData.data = await handler(context);
      }

      return responseData;
    }
    responseData.status = "error";
    responseData.error = createWsErrorEnvelope("not_found", "Route not found");
  } catch (e: unknown) {
    if (e instanceof ValidationError) {
      responseData.status = "error";
      responseData.error = createWsErrorEnvelope(
        "validation_failed",
        "Validation failure",
        {
          details: {
            kind: "validation",
            messages: e.messages,
          },
        },
      );
    } else {
      logger.error(
        {
          err: e,
          requestId,
          userId,
          route: routePath,
          wsEvent: message.event,
        },
        "WS Message Error",
      );
      responseData.status = "error";
      responseData.error = createWsErrorEnvelope(
        "internal_error",
        "Internal server error",
      );
    }
  }

  return responseData;
};
