import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadSmsProviderModule() {
  return import('./sms-verification-provider.js');
}

describe('fakeSmsVerificationProvider', () => {
  afterEach(() => {
    delete process.env['APP_ENV'];
    delete process.env['AUTH_SMS_PROVIDER'];
    vi.resetModules();
  });

  it('issues a deterministic code and records the latest delivery', async () => {
    process.env['AUTH_SMS_PROVIDER'] = 'fake';
    const { fakeSmsVerificationProvider } = await loadSmsProviderModule();
    const result = await fakeSmsVerificationProvider.issueVerificationCode({
      phone: '+14155550123',
      flow: 'register_phone',
    });

    expect(result.code).toBe('123456');
    expect(result.providerRequestId).toBe('fake-1');
    expect(fakeSmsVerificationProvider.latestForPhone('+14155550123')).toEqual(
      expect.objectContaining({
        phone: '+14155550123',
        flow: 'register_phone',
        code: '123456',
      }),
    );
  });

  it('defers fake-provider environment policy to bootstrap validation', async () => {
    vi.resetModules();
    process.env['APP_ENV'] = 'production';
    process.env['AUTH_SMS_PROVIDER'] = 'fake';

    const { fakeSmsVerificationProvider, smsVerificationProvider } =
      await loadSmsProviderModule();

    expect(smsVerificationProvider).toBe(fakeSmsVerificationProvider);
  });
});
