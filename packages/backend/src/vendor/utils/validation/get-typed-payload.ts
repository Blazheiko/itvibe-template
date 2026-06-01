import type { HttpContext, WsContext } from "#vendor/types/types.js";

/**
 * Извлекает типизированный payload из контекста.
 * Тип payload выводится автоматически из generic параметра контекста.
 * Предполагает что валидация уже выполнена в server.ts
 */
export function getTypedPayload<TPayload>(
  context: HttpContext<TPayload> | WsContext<TPayload>,
): TPayload {
  const payload =
    "httpData" in context ? context.httpData.payload : context.wsData.payload;

  if (payload === null) {
    throw new Error("Payload is missing");
  }

  // Runtime validation happens before this helper is called.
  return payload as TPayload;
}

/**
 * Извлекает типизированный query из контекста.
 *
 * Используется в middleware (которое не параметризовано generic'ом конкретного
 * роута, поэтому форма `httpData.query` на type-level там — `null`). Для
 * чтения из middleware вызывается с явным типом:
 *
 *   const { userId } = getTypedQuery<{ userId: string }>(ctx);
 *
 * На runtime валидация уже выполнена в server.ts (`validateQuery`), поэтому
 * хелпер ничего не валидирует — он только сужает тип. Если на роуте не объявлен
 * `queryValidator`, поле строго `null`, и хелпер кидает.
 *
 * Это не пользовательская ошибка, а ошибка конфигурации роута/вызова
 * middleware: хелпер должен использоваться только там, где schema уже
 * объявлена на route definition.
 *
 * В контроллерах handler уже знает форму query через generic `HttpHandler`,
 * поэтому хелпер там не нужен.
 */
export function getTypedQuery<TQuery>(context: HttpContext): TQuery {
  const query = context.httpData.query;
  if (query === null) {
    throw new Error(
      "getTypedQuery called on a route without queryValidator — declare a schema first",
    );
  }
  return query;
}

/**
 * Type guard для проверки что контекст является HttpContext
 */
export function isHttpContext<TPayload>(
  context: HttpContext<TPayload> | WsContext<TPayload>,
): context is HttpContext<TPayload> {
  return "httpData" in context;
}

/**
 * Type guard для проверки что контекст является WsContext
 */
export function isWsContext<TPayload>(
  context: HttpContext<TPayload> | WsContext<TPayload>,
): context is WsContext<TPayload> {
  return "wsData" in context;
}
