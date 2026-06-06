import type { HttpContext } from "#vendor/types/types.js";
import { getTypedPayload } from "#vendor/utils/validation/get-typed-payload.js";
import { mainService } from "#app/services/core/main-service.js";
import { mapControllerError } from "#app/controllers/shared/controller-error.js";
import type {
  InitResponse,
  TestHeadersResponse,
  GetSetCookiesResponse,
  TestSessionResponse,
  SetHeaderAndCookieResponse,
  TestMiddlewareResponse,
  UpdateWsTokenResponse,
} from "shared";
import type { SaveUserInput } from "shared/schemas";
import { Result } from "better-result";

export default {
  testSentryError({ logger }: HttpContext): never {
    logger.info("testSentryError");
    throw new Error("Sentry test error");
  },

  testHeaders({ httpData, logger }: HttpContext): TestHeadersResponse {
    logger.info("testHeaders");
    return mainService.testHeaders(httpData);
  },

  getSetCookies({ httpData, logger }: HttpContext): GetSetCookiesResponse {
    logger.info("testCookies");
    return mainService.getSetCookies(httpData);
  },

  testSession({ session, httpData, logger }: HttpContext): TestSessionResponse {
    logger.info("testSession");
    return mainService.testSession(httpData, session.sessionInfo ?? null);
  },

  async updateWsToken({
    responseData,
    session,
    logger,
  }: HttpContext): Promise<UpdateWsTokenResponse> {
    logger.info("updateWsToken");

    const result = await mainService.updateWsToken(session.sessionInfo ?? null);
    if (Result.isError(result)) {
      return mapControllerError({ responseData }, result.error);
    }

    return { status: "ok", ...result.value };
  },

  ping() {
    return { ping: "ok" };
  },

  async init({
    responseData,
    session,
    logger,
  }: HttpContext): Promise<InitResponse> {
    logger.info("init");

    const result = await mainService.init(session.sessionInfo ?? null);
    if (Result.isError(result)) {
      return mapControllerError({ responseData }, result.error);
    }

    return { status: "ok", ...result.value };
  },

  setHeaderAndCookie({
    responseData,
    logger,
  }: HttpContext): SetHeaderAndCookieResponse {
    logger.info("set-header-and-cookie");
    return mainService.setHeaderAndCookie(responseData);
  },

  testMiddleware({
    responseData,
    logger,
  }: HttpContext): TestMiddlewareResponse {
    logger.info("testMiddleware controller");
    return mainService.testMiddleware(responseData);
  },

  testMiddleware2({
    responseData,
    logger,
  }: HttpContext): TestMiddlewareResponse {
    logger.info("testMiddleware2 controller");
    return mainService.testMiddleware(responseData);
  },

  testMiddleware3({
    responseData,
    logger,
  }: HttpContext): TestMiddlewareResponse {
    logger.info("testMiddleware3 controller");
    return mainService.testMiddleware(responseData);
  },

  async saveUser(
    context: HttpContext<SaveUserInput>,
  ): Promise<Awaited<ReturnType<typeof mainService.saveUser>>> {
    context.logger.info("saveUser");
    const payload = getTypedPayload(context);
    return mainService.saveUser(payload);
  },
};
