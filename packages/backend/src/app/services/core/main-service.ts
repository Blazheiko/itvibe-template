import type {
  HttpData,
  ResponseData,
  SessionInfo,
} from "#vendor/types/types.js";
import { userRepository } from "#app/repositories/index.js";
import { userTransformer } from "#app/transformers/index.js";
import { generateWsToken } from "#app/services/auth/generate-ws-token-service.js";
import { getWsUrl } from "#app/services/communication/get-ws-url-service.js";
import diskConfig from "#config/disk.js";
import appConfig from "#config/app.js";
import type { SaveUserInput } from "shared/schemas";
import logger from "#vendor/utils/logger.js";
import { Result } from "better-result";
import {
  notFound,
  unauthorized,
  type AppResult,
} from "#app/services/shared/errors.js";
import { tryInternal } from "#app/services/shared/result-helpers.js";
import { getSessionCsrfToken } from "#vendor/utils/session/csrf-token.js";

interface StorageConfigPayload {
  cdnUrl: string;
  s3Prefix: string;
  s3StaticDataPrefix: string;
  s3DynamicDataPrefix: string;
}

interface InitUserPayload {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  avatar: string | null;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
}

export const mainService = {
  ping(): { status: "ok" } {
    return { status: "ok" };
  },

  testHeaders(httpData: HttpData): {
    status: "ok";
    headers: { key: string; value: string }[];
    params: unknown[];
  } {
    const headers: { key: string; value: string }[] = [];
    const params: unknown[] = Object.entries(httpData.params);

    httpData.headers.forEach((value, key) => {
      headers.push({ key, value });
    });

    return { status: "ok", headers, params };
  },

  getSetCookies(httpData: HttpData): {
    status: "ok";
    cookies: { key: string; value: string }[];
  } {
    const cookies: { key: string; value: string }[] = [];
    httpData.cookies.forEach((value, key) => {
      cookies.push({ key, value });
    });
    return { status: "ok", cookies };
  },

  testSession(
    httpData: HttpData,
    sessionInfo: SessionInfo | null,
  ): {
    status: "ok";
    cookies: { key: string; value: string }[];
    sessionInfo: SessionInfo | null;
  } {
    const cookies: { key: string; value: string }[] = [];
    httpData.cookies.forEach((value, key) => {
      cookies.push({ key, value });
    });
    return { status: "ok", cookies, sessionInfo };
  },

  async updateWsToken(sessionInfo: SessionInfo | null): Promise<
    AppResult<{
      wsUrl: string;
      wsToken: string;
    }>
  > {
    if (sessionInfo === null) {
      return Result.err(unauthorized("Session not found"));
    }

    const userId = sessionInfo.data.userId;
    if (userId === undefined || userId === "") {
      return Result.err(unauthorized("Session expired"));
    }

    const wsToken = await generateWsToken(sessionInfo, userId);
    return Result.ok({
      wsUrl: wsToken !== "" ? getWsUrl() : "",
      wsToken,
    });
  },

  async init(
    sessionInfo: SessionInfo | null,
  ): Promise<
    AppResult<{
      csrfToken?: string;
      user: InitUserPayload;
      wsUrl: string;
      wsToken: string;
      storage: StorageConfigPayload;
    }>
  > {
    if (sessionInfo === null) {
      return Result.err(notFound("Session", "Session not found"));
    }

    const userId = sessionInfo.data.userId;
    if (userId === undefined || userId === "") {
      return Result.err(unauthorized("Session expired"));
    }

    const userResult = await tryInternal(
      () => userRepository.findById(BigInt(userId)),
      "Failed to load session user",
    );
    if (Result.isError(userResult)) {
      logger.warn(
        { err: userResult.error, userId },
        "Failed to load session user",
      );
      return Result.err(userResult.error);
    }

    const user = userResult.value;
    if (user === undefined) {
      return Result.err(unauthorized("Session expired"));
    }

    const wsTokenResult = await tryInternal(
      () => generateWsToken(sessionInfo, String(user.id)),
      "Failed to generate ws token",
    );

    if (Result.isError(wsTokenResult)) {
      logger.warn(
        { err: wsTokenResult.error, userId },
        "Failed to initialize session",
      );
      return Result.err(wsTokenResult.error);
    }

    const wsToken = wsTokenResult.value;

    const csrfToken = getSessionCsrfToken(sessionInfo);
    return Result.ok({
      ...(csrfToken !== undefined ? { csrfToken } : {}),
      user: {
        id: String(user.id),
        name: user.name,
        email: user.email ?? "",
        phone: user.phone ?? null,
        emailVerified: user.emailVerifiedAt !== null,
        emailVerifiedAt:
          user.emailVerifiedAt === null
            ? null
            : user.emailVerifiedAt.toISOString(),
        avatar: user.avatar ?? null,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      wsUrl: wsToken !== "" ? getWsUrl() : "",
      wsToken,
      storage: {
        cdnUrl: appConfig.cdnUrl,
        s3Prefix: diskConfig.s3Prefix ?? "",
        s3StaticDataPrefix: diskConfig.s3StaticDataPrefix ?? "",
        s3DynamicDataPrefix: diskConfig.s3DynamicDataPrefix ?? "",
      },
    });
  },

  setHeaderAndCookie(responseData: ResponseData): { status: "ok" } {
    responseData.headers.push({ name: "test-header", value: "test" });
    responseData.setCookie({
      name: "cookieTest1",
      value: "test",
      path: "/",
      httpOnly: true,
      secure: false,
      maxAge: 3600,
      expires: undefined,
      sameSite: undefined,
    });
    responseData.setCookie("cookieTest2", "test");
    return { status: "ok" };
  },

  testMiddleware(responseData: ResponseData): {
    middlewares: string[];
    status: "ok";
  } {
    return {
      middlewares: responseData.middlewareData as unknown as string[],
      status: "ok",
    };
  },

  async saveUser(payload: SaveUserInput): Promise<{
    status: "ok" | "error";
    message?: string;
    user?: ReturnType<typeof userTransformer.serialize>;
  }> {
    const userResult = await tryInternal(
      () =>
        userRepository.create({
          name: payload.name,
          email: payload.email.toLowerCase(),
          password: payload.password,
        }),
      "Failed to create user",
    );

    if (Result.isError(userResult)) {
      logger.warn({ err: userResult.error }, "Failed to create user");
      return Result.err(userResult.error);
    }

    return { status: "ok", user: userTransformer.serialize(userResult.value) };
  },
};
