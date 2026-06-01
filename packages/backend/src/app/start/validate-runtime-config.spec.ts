import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, ORIGINAL_ENV);
}

afterEach(() => {
  vi.resetModules();
  restoreEnv();
});

describe('validateRuntimeConfig', () => {
  it('allows unsupported provider by default', async () => {
    delete process.env['AUTH_SMS_PROVIDER'];
    const { validateRuntimeConfig } = await import('./validate-runtime-config.js');
    expect(() => {
      validateRuntimeConfig();
    }).not.toThrow();
  });

  it('rejects phone auth when neither AUTH_OTP_HMAC_KEY nor APP_KEY is configured', async () => {
    process.env['AUTH_PHONE_ENABLED'] = 'true';
    delete process.env['AUTH_OTP_HMAC_KEY'];
    delete process.env['APP_KEY'];

    const { validateRuntimeConfig } = await import('./validate-runtime-config.js');
    expect(() => {
      validateRuntimeConfig();
    }).toThrow(
      'Phone authentication requires AUTH_OTP_HMAC_KEY or APP_KEY for OTP hashing',
    );
  });

  it('rejects short OTP hashing secrets for phone auth', async () => {
    process.env['AUTH_PHONE_ENABLED'] = 'true';
    process.env['AUTH_OTP_HMAC_KEY'] = 'short-secret';

    const { validateRuntimeConfig } = await import('./validate-runtime-config.js');
    expect(() => {
      validateRuntimeConfig();
    }).toThrow(
      'Phone authentication requires AUTH_OTP_HMAC_KEY or APP_KEY to be at least 32 characters long',
    );
  });

  it('allows phone auth when AUTH_OTP_HMAC_KEY is explicitly configured', async () => {
    process.env['AUTH_PHONE_ENABLED'] = 'true';
    process.env['AUTH_OTP_HMAC_KEY'] = 'c'.repeat(32);

    const { validateRuntimeConfig } = await import('./validate-runtime-config.js');
    expect(() => {
      validateRuntimeConfig();
    }).not.toThrow();
  });

  it('rejects fake provider without explicit allow flag', async () => {
    process.env['AUTH_SMS_PROVIDER'] = 'fake';
    process.env['AUTH_FAKE_SMS_CODE'] = '654321';
    const { validateRuntimeConfig } = await import('./validate-runtime-config.js');
    expect(() => {
      validateRuntimeConfig();
    }).toThrow(
      'AUTH_SMS_PROVIDER=fake requires AUTH_SMS_PROVIDER_ALLOW_FAKE=true',
    );
  });

  it('rejects fake provider in production-like environments even when allow flag is set', async () => {
    process.env['AUTH_SMS_PROVIDER'] = 'fake';
    process.env['AUTH_SMS_PROVIDER_ALLOW_FAKE'] = 'true';
    process.env['AUTH_FAKE_SMS_CODE'] = '654321';
    process.env['APP_ENV'] = 'prod';
    process.env['SESSION_COOKIE_HOST_PREFIX'] = 'false';
    const { validateRuntimeConfig } = await import('./validate-runtime-config.js');
    expect(() => {
      validateRuntimeConfig();
    }).toThrow(
      'AUTH_SMS_PROVIDER=fake is forbidden in production-like environments',
    );
  });

  it('rejects fake provider when AUTH_FAKE_SMS_CODE is not explicitly set', async () => {
    process.env['AUTH_SMS_PROVIDER'] = 'fake';
    process.env['AUTH_SMS_PROVIDER_ALLOW_FAKE'] = 'true';
    process.env['APP_ENV'] = 'local';
    const { validateRuntimeConfig } = await import('./validate-runtime-config.js');
    expect(() => {
      validateRuntimeConfig();
    }).toThrow(
      'AUTH_FAKE_SMS_CODE must be explicitly set when AUTH_SMS_PROVIDER=fake is enabled',
    );
  });

  it('allows fake provider only with explicit allow flag, explicit code, and non-production env', async () => {
    process.env['AUTH_SMS_PROVIDER'] = 'fake';
    process.env['AUTH_SMS_PROVIDER_ALLOW_FAKE'] = 'true';
    process.env['AUTH_FAKE_SMS_CODE'] = '654321';
    process.env['APP_ENV'] = 'development';
    const { validateRuntimeConfig } = await import('./validate-runtime-config.js');
    expect(() => {
      validateRuntimeConfig();
    }).not.toThrow();
  });

  it('treats APP_IS_PRODUCTION=true as authoritative', async () => {
    process.env['AUTH_SMS_PROVIDER'] = 'fake';
    process.env['AUTH_SMS_PROVIDER_ALLOW_FAKE'] = 'true';
    process.env['AUTH_FAKE_SMS_CODE'] = '654321';
    process.env['APP_ENV'] = 'dev';
    process.env['APP_IS_PRODUCTION'] = 'true';
    process.env['SESSION_COOKIE_HOST_PREFIX'] = 'false';
    const { validateRuntimeConfig } = await import('./validate-runtime-config.js');
    expect(() => {
      validateRuntimeConfig();
    }).toThrow(
      'AUTH_SMS_PROVIDER=fake is forbidden in production-like environments',
    );
  });

  it('rejects SESSION_COOKIE_HOST_PREFIX=true when session cookie cannot be Secure', async () => {
    process.env['APP_ENV'] = 'local';
    process.env['SESSION_COOKIE_HOST_PREFIX'] = 'true';
    process.env['APP_URL'] = 'https://app.example.com';
    const { validateRuntimeConfig } = await import('./validate-runtime-config.js');
    expect(() => {
      validateRuntimeConfig();
    }).toThrow(
      'SESSION_COOKIE_HOST_PREFIX=true requires the session cookie to be served with Secure=true',
    );
  });

  it('rejects SESSION_COOKIE_HOST_PREFIX=true when APP_URL is not https', async () => {
    process.env['APP_ENV'] = 'prod';
    process.env['SESSION_COOKIE_HOST_PREFIX'] = 'true';
    process.env['APP_URL'] = 'http://app.example.com';
    const { validateRuntimeConfig } = await import('./validate-runtime-config.js');
    expect(() => {
      validateRuntimeConfig();
    }).toThrow(
      'SESSION_COOKIE_HOST_PREFIX=true requires APP_URL to use https://',
    );
  });

  it('allows SESSION_COOKIE_HOST_PREFIX=true with Secure cookie and https APP_URL', async () => {
    process.env['APP_ENV'] = 'prod';
    process.env['SESSION_COOKIE_HOST_PREFIX'] = 'true';
    process.env['APP_URL'] = 'https://app.example.com';
    delete process.env['AUTH_SMS_PROVIDER'];
    const { validateRuntimeConfig } = await import('./validate-runtime-config.js');
    expect(() => {
      validateRuntimeConfig();
    }).not.toThrow();
  });
});
