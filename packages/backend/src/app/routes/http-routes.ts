import AuthController from "#app/controllers/http/auth-controller.js";
import OAuthController from "#app/controllers/http/oauth-controller.js";
import { defineRoute } from "#app/routing/define-route.js";
import * as ResponseSchemas from "shared/responses";
import {
  ChangePasswordInputSchema,
  EmptyFormInputSchema,
  ForgotPasswordInputSchema,
  LoginInputSchema,
  OAuthCallbackQuerySchema,
  OAuthRedirectQuerySchema,
  RegisterInputSchema,
  ResetPasswordInputSchema,
  VerifyEmailInputSchema,
} from "shared/schemas";

export default [
  {
    group: [
      defineRoute({
        url: "/register",
        method: "post",
        handler: AuthController.register.bind(AuthController),
        validator: RegisterInputSchema,
        ResponseSchema: ResponseSchemas.RegisterResponseSchema,
        description: "Register a new user",
      }),
      defineRoute({
        url: "/login",
        method: "post",
        handler: AuthController.login.bind(AuthController),
        validator: LoginInputSchema,
        ResponseSchema: ResponseSchemas.LoginResponseSchema,
        description: "Login a user",
      }),
      defineRoute({
        url: "/me",
        method: "get",
        handler: AuthController.me.bind(AuthController),
        ResponseSchema: ResponseSchemas.CurrentUserResponseSchema,
        description: "Get current authenticated user",
        middlewares: ["auth_guard"],
      }),
      defineRoute({
        url: "/logout",
        method: "post",
        handler: AuthController.logout.bind(AuthController),
        validator: EmptyFormInputSchema,
        ResponseSchema: ResponseSchemas.LogoutResponseSchema,
        description: "Logout a user",
        middlewares: ["auth_guard"],
      }),
      defineRoute({
        url: "/logout-all",
        method: "post",
        handler: AuthController.logoutAll.bind(AuthController),
        validator: EmptyFormInputSchema,
        ResponseSchema: ResponseSchemas.LogoutAllResponseSchema,
        description: "Logout all devices",
        middlewares: ["auth_guard"],
      }),
      defineRoute({
        url: "/change-password",
        method: "post",
        handler: AuthController.changePassword.bind(AuthController),
        validator: ChangePasswordInputSchema,
        ResponseSchema: ResponseSchemas.ChangePasswordResponseSchema,
        description: "Change or set user password",
        middlewares: ["auth_guard"],
      }),
      defineRoute({
        url: "/forgot-password",
        method: "post",
        handler: AuthController.forgotPassword.bind(AuthController),
        validator: ForgotPasswordInputSchema,
        ResponseSchema: ResponseSchemas.ForgotPasswordResponseSchema,
        description: "Request password reset email",
        rateLimit: {
          windowMs: 1 * 60 * 1000,
          maxRequests: 3,
        },
      }),
      defineRoute({
        url: "/reset-password",
        method: "post",
        handler: AuthController.resetPassword.bind(AuthController),
        validator: ResetPasswordInputSchema,
        ResponseSchema: ResponseSchemas.ResetPasswordResponseSchema,
        description: "Reset password using a one-time token",
        rateLimit: {
          windowMs: 1 * 60 * 1000,
          maxRequests: 10,
        },
      }),
      defineRoute({
        url: "/verify-email",
        method: "post",
        handler: AuthController.verifyEmail.bind(AuthController),
        validator: VerifyEmailInputSchema,
        ResponseSchema: ResponseSchemas.VerifyEmailResponseSchema,
        description: "Confirm user email by verification token",
        rateLimit: {
          windowMs: 1 * 60 * 1000,
          maxRequests: 10,
        },
      }),
      defineRoute({
        url: "/resend-verification-email",
        method: "post",
        handler: AuthController.resendVerificationEmail.bind(AuthController),
        validator: EmptyFormInputSchema,
        ResponseSchema: ResponseSchemas.ResendVerificationEmailResponseSchema,
        description: "Resend verification email to authenticated user",
        middlewares: ["auth_guard"],
        rateLimit: {
          windowMs: 1 * 60 * 1000,
          maxRequests: 3,
        },
      }),
    ],
    description: "Auth routes",
    middlewares: ["session_web"],
    prefix: "auth",
    rateLimit: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 10,
    },
  },
  {
    group: [
      defineRoute({
        url: "/:provider/redirect",
        method: "get",
        handler: OAuthController.redirect.bind(OAuthController),
        queryValidator: OAuthRedirectQuerySchema,
        ResponseSchema: ResponseSchemas.OAuthRedirectResponseSchema,
        description: "Redirect to OAuth provider",
      }),
      defineRoute({
        url: "/:provider/callback",
        method: "get",
        handler: OAuthController.callback.bind(OAuthController),
        queryValidator: OAuthCallbackQuerySchema,
        queryAllowExtra: true,
        ResponseSchema: ResponseSchemas.OAuthCallbackResponseSchema,
        description: "OAuth provider callback",
      }),
    ],
    description: "OAuth routes",
    middlewares: ["session_web"],
    prefix: "auth/oauth",
    rateLimit: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 20,
    },
  },
];
