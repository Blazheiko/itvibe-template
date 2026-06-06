import { type } from "@arktype/type";
import { CanonicalErrorResponseSchema } from "./error-response.js";

export const PingResponseSchema = type({
  status: "string",
});
export type PingResponse = typeof PingResponseSchema.infer;

export const TestRouteResponseSchema = type({
  status: "string",
});
export type TestRouteResponse = typeof TestRouteResponseSchema.infer;

export const PingRouteResponseSchema = type({
  ping: "string",
});
export type PingResponseSchema = typeof PingRouteResponseSchema.infer;

export const InitResponseSchema = type.or(
  {
    status: "'ok'",
    "csrfToken?": "string",
    "user?": {
      id: "string",
      name: "string",
      email: "string",
      "phone?": "string | null",
      emailVerified: "boolean",
      "emailVerifiedAt?": "string | null",
      "avatar?": "string | null",
      "role?": "'user' | 'admin'",
      createdAt: "string",
      updatedAt: "string",
    },
    "wsUrl?": "string",
    "wsToken?": "string",
    "storage?": {
      "cdnUrl?": "string",
      "s3Prefix?": "string",
      "s3StaticDataPrefix?": "string",
      "s3DynamicDataPrefix?": "string",
    },
  },
  CanonicalErrorResponseSchema,
);
export interface InitResponse extends Record<string, unknown> {
  status: "ok" | "error";
  code?: string;
  reason?: string;
  details?: unknown;
  message?: string;
  csrfToken?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    emailVerified: boolean;
    emailVerifiedAt?: string | null;
    avatar?: string | null;
    role?: "user" | "admin";
    createdAt: string;
    updatedAt: string;
  };
  wsUrl?: string;
  wsToken?: string;
  storage?: {
    cdnUrl?: string;
    s3Prefix?: string;
    s3StaticDataPrefix?: string;
    s3DynamicDataPrefix?: string;
  };
}

export const TestHeadersResponseSchema = type({
  status: "string",
  headers: "unknown[]",
  params: "unknown[]",
});
export type TestHeadersResponse = typeof TestHeadersResponseSchema.infer;

export const GetSetCookiesResponseSchema = type({
  status: "string",
  cookies: "unknown[]",
});
export type GetSetCookiesResponse = typeof GetSetCookiesResponseSchema.infer;

export const TestSessionResponseSchema = type({
  status: "string",
  cookies: "unknown[]",
  sessionInfo: "unknown",
});
export type TestSessionResponse = typeof TestSessionResponseSchema.infer;

export const SaveUserResponseSchema = type({
  status: "'ok' | 'error'",
  "code?": "string",
  "reason?": "string",
  "details?": "unknown",
  "message?": "string",
  "user?": {
    id: "string",
    name: "string",
    email: "string",
    "phone?": "string | null",
    emailVerified: "boolean",
    "emailVerifiedAt?": "string | null",
    "avatar?": "string | null",
  },
});
export interface SaveUserResponse extends Record<string, unknown> {
  status: "ok" | "error";
  code?: string;
  reason?: string;
  details?: unknown;
  message?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    emailVerified: boolean;
    emailVerifiedAt?: string | null;
    avatar?: string | null;
  };
}

export const TestApiSessionResponseSchema = type({
  status: "string",
  headers: "unknown[]",
  sessionInfo: "unknown",
});
export type TestApiSessionResponse = typeof TestApiSessionResponseSchema.infer;

export const IndexResponseSchema = type({
  payload: "unknown",
  responseData: "unknown",
});
export type IndexResponse = typeof IndexResponseSchema.infer;

export const TestParamsResponseSchema = type({
  params: "unknown",
  query: "string[]",
  status: "string",
});
export type TestParamsResponse = typeof TestParamsResponseSchema.infer;

export const SetHeaderAndCookieResponseSchema = type({
  status: "string",
});
export type SetHeaderAndCookieResponse =
  typeof SetHeaderAndCookieResponseSchema.infer;

export const TestMiddlewareResponseSchema = type({
  middlewares: "string[]",
  status: "string",
});
export type TestMiddlewareResponse = typeof TestMiddlewareResponseSchema.infer;

export const UpdateWsTokenResponseSchema = type.or(
  {
    status: "'ok'",
    "wsUrl?": "string",
    "wsToken?": "string",
  },
  CanonicalErrorResponseSchema,
);
export interface UpdateWsTokenResponse extends Record<string, unknown> {
  status: "ok" | "error";
  code?: string;
  reason?: string;
  details?: unknown;
  message?: string;
  wsUrl?: string;
  wsToken?: string;
}
