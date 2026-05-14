import type { HttpContext } from "#vendor/types/types.js";
import { mapControllerError } from "#app/controllers/shared/controller-error.js";
import { Result } from "better-result";
import { oauthService } from "#app/services/oauth-service.js";
import { badRequest } from "#app/services/shared/errors.js";
import type { OAuthCallbackQuery, OAuthRedirectQuery } from "shared/schemas";
import oauthConfig from "#config/oauth.js";
import type { OAuthRedirectResponse, OAuthCallbackResponse } from "shared";

export default {
  async redirect(
    context: HttpContext<unknown, OAuthRedirectQuery>,
  ): Promise<OAuthRedirectResponse> {
    const provider = context.httpData.params["provider"] ?? "";
    context.logger.info({ provider }, "oauth redirect handler");

    const result = oauthService.getAuthorizationUrl(provider);

    if (Result.isError(result)) {
      return mapControllerError(context, result.error);
    }

    context.logger.info({ url: result.value.url }, "oauth generated URL");

    // Store state and codeVerifier in session for the callback exchange.
    await context.session.updateSessionData({
      oauthState: result.value.state,
      oauthCodeVerifier: result.value.codeVerifier,
    });

    context.responseData.status = 302;
    context.responseData.setHeader("Location", result.value.url);

    return { status: "redirect" };
  },

  async callback(
    context: HttpContext<unknown, OAuthCallbackQuery>,
  ): Promise<OAuthCallbackResponse> {
    const { httpData, logger, session, responseData, auth } = context;
    const provider = httpData.params["provider"] ?? "";
    const query = httpData.query;
    const code = query.code ?? "";
    const receivedState = query.state ?? "";

    logger.info(
      { provider, hasCode: code !== "", hasState: receivedState !== "" },
      "oauth callback handler",
    );

    const sessionData = session.sessionInfo?.data;
    const storedState =
      typeof sessionData?.["oauthState"] === "string"
        ? sessionData["oauthState"]
        : "";
    const codeVerifier =
      typeof sessionData?.["oauthCodeVerifier"] === "string"
        ? sessionData["oauthCodeVerifier"]
        : null;
    if (code === "" || receivedState === "" || storedState === "") {
      responseData.status = 302;
      responseData.setHeader("Location", oauthConfig.frontendErrorUrl);
      return mapControllerError(context, badRequest("Missing OAuth parameters"));
    }

    const result = await oauthService.handleCallback(
      provider,
      code,
      storedState,
      receivedState,
      codeVerifier,
      auth,
    );

    // Clean up OAuth session data
    await session.updateSessionData({
      oauthState: undefined,
      oauthCodeVerifier: undefined,
    });

    if (Result.isError(result)) {
      responseData.status = 302;
      responseData.setHeader("Location", oauthConfig.frontendErrorUrl);
      return mapControllerError(context, result.error);
    }

    responseData.status = 302;
    responseData.setHeader("Location", result.value.redirectUrl);

    return { status: "success" };
  },
};
