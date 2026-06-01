import logger from "#vendor/utils/logger.js";
import { normalizePath } from "#vendor/utils/network/http-request-handlers.js";
import appConfig from "#config/app.js";
import type {
  Method,
  RateLimit,
  RouteItem,
  WsRoutes,
  routeList,
} from "#vendor/types/types.js";

const parseRouteParams = (url: string): string[] =>
  url
    .split("/")
    .filter((segment) => segment.startsWith(":"))
    .map((segment) => segment.slice(1));

const createRoute = (
  method: Method,
  route: RouteItem,
  groupRateLimit: RateLimit | undefined,
): RouteItem => {
  const responseSchema = route.ResponseSchema;
  const normalizedUrl = normalizePath(route.url);

  return {
    method,
    url: `${appConfig.pathPrefix}/${normalizedUrl}`,
    handler: route.handler,
    middlewares: route.middlewares ?? [],
    validator: route.validator ?? undefined,
    queryValidator: route.queryValidator ?? undefined,
    queryAllowExtra: route.queryAllowExtra ?? undefined,
    queryArrays: route.queryArrays ?? undefined,
    rateLimit: route.rateLimit ?? groupRateLimit,
    groupRateLimit: groupRateLimit ?? undefined,
    parametersKey: parseRouteParams(normalizedUrl),
    description: route.description,
    allowedContentTypes: route.allowedContentTypes,
    ...(responseSchema !== undefined ? { ResponseSchema: responseSchema } : {}),
  };
};

const routeHandler = (
  route: RouteItem,
  groupRateLimit?: RateLimit,
): RouteItem => {
  let method = route.method;
  method = method === "delete" ? "del" : route.method;
  return createRoute(method, route, groupRateLimit);
};

const routesHandler = (routeList: routeList): RouteItem[] => {
  logger.info("routes Handler start");
  const parseRouteList = parseGroups(routeList, "", [], undefined);
  return parseRouteList.map((route) =>
    routeHandler(route, route.groupRateLimit),
  );
};

const parseGroups = (
  routeList: routeList,
  prefix: string,
  middlewares: string[],
  groupRateLimit: RateLimit | undefined,
): RouteItem[] => {
  const parseRouteList: RouteItem[] = [];
  routeList.forEach((route) => {
    if (
      "group" in route &&
      Array.isArray(route.group) &&
      route.group.length > 0
    ) {
      const prefixInitial = normalizePath(prefix);
      const prefixGroup = normalizePath(route.prefix ?? "");
      const middlewaresGroup =
        route.middlewares !== undefined &&
        Array.isArray(route.middlewares) &&
        route.middlewares.length > 0
          ? middlewares.concat(route.middlewares)
          : middlewares;
      // Group limits are passed to subgroups
      const currentGroupRateLimit = route.rateLimit ?? groupRateLimit;
      const routeGroup = parseGroups(
        route.group,
        `${prefixInitial}/${prefixGroup}`,
        middlewaresGroup,
        currentGroupRateLimit,
      );
      routeGroup.forEach((item) => {
        parseRouteList.push(item);
      });
    } else if ("url" in route && "handler" in route) {
      const routeUrl =
        prefix !== "" ? `${prefix}/${normalizePath(route.url)}` : route.url;
      const routeMiddlewares =
        middlewares.length > 0
          ? middlewares.concat(route.middlewares ?? [])
          : route.middlewares;

      parseRouteList.push({
        ...route,
        url: routeUrl,
        middlewares: routeMiddlewares,
        groupRateLimit,
      });
    }
  });
  return parseRouteList;
};

// Convert flat routes into the full-url lookup used by the WS dispatcher.
// WS dispatch is exact-match only; `:param` route matching is not supported.
const createWsRoutesByUrl = (routes: RouteItem[]): WsRoutes => {
  const routesByUrl: WsRoutes = {};
  routes.forEach((route) => {
    if (routesByUrl[route.url] !== undefined) {
      logger.warn({ url: route.url }, "Duplicate WS route URL");
    }
    routesByUrl[route.url] = route;
  });
  return routesByUrl;
};

export { createWsRoutesByUrl, routesHandler };
