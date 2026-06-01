import { createHmac, timingSafeEqual } from 'node:crypto';
import appConfig from '#config/app.js';
import { authConfig } from '#config/auth.js';

function resolveOtpHashSecret(): string {
  const configuredSecret = authConfig.otpHmacKey?.trim();
  const appSecret = appConfig.key?.trim();

  if (configuredSecret && configuredSecret !== '') {
    return configuredSecret;
  }

  if (appSecret && appSecret !== '') {
    return appSecret;
  }

  throw new Error(
    'OTP verification hashing secret is not configured. Set AUTH_OTP_HMAC_KEY or APP_KEY.',
  );
}

export function hashOtpVerificationCode(code: string): string {
  return createHmac('sha256', resolveOtpHashSecret()).update(code).digest('hex');
}

export function verifyOtpVerificationCode(
  code: string,
  expectedHash: string,
): boolean {
  const actualHash = hashOtpVerificationCode(code);

  if (actualHash.length !== expectedHash.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(actualHash, 'hex'),
    Buffer.from(expectedHash, 'hex'),
  );
}
