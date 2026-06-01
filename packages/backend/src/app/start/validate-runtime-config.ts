import appConfig from '#config/app.js';
import { authConfig } from '#config/auth.js';
import sessionConfig from '#config/session.js';

export function validateRuntimeConfig(): void {
  if (sessionConfig.useHostPrefix) {
    if (!sessionConfig.cookie.secure) {
      throw new Error(
        'SESSION_COOKIE_HOST_PREFIX=true requires the session cookie to be served with Secure=true',
      );
    }
    if (!appConfig.url.startsWith('https://')) {
      throw new Error(
        'SESSION_COOKIE_HOST_PREFIX=true requires APP_URL to use https://',
      );
    }
  }

  if (authConfig.phoneAuthEnabled) {
    const otpHashSecret = authConfig.otpHmacKey?.trim() || appConfig.key?.trim() || '';

    if (otpHashSecret === '') {
      throw new Error(
        'Phone authentication requires AUTH_OTP_HMAC_KEY or APP_KEY for OTP hashing',
      );
    }

    if (otpHashSecret.length < 32) {
      throw new Error(
        'Phone authentication requires AUTH_OTP_HMAC_KEY or APP_KEY to be at least 32 characters long',
      );
    }
  }

  if (authConfig.smsProvider !== 'fake') {
    return;
  }

  if (!authConfig.allowFakeSmsProvider) {
    throw new Error(
      'AUTH_SMS_PROVIDER=fake requires AUTH_SMS_PROVIDER_ALLOW_FAKE=true',
    );
  }

  if (appConfig.isProductionLike) {
    throw new Error(
      'AUTH_SMS_PROVIDER=fake is forbidden in production-like environments',
    );
  }

  if (!authConfig.fakeSmsCodeExplicitlySet) {
    throw new Error(
      'AUTH_FAKE_SMS_CODE must be explicitly set when AUTH_SMS_PROVIDER=fake is enabled',
    );
  }
}
