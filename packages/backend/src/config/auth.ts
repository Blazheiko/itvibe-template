function parseBooleanFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return value === '1' || value.toLowerCase() === 'true';
}

function parseNumberFlag(value: string | undefined, defaultValue: number): number {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

const rawFakeSmsCode = process.env['AUTH_FAKE_SMS_CODE'];

export const authConfig = {
  strictRegistration: parseBooleanFlag(
    process.env['AUTH_STRICT_REGISTRATION'],
    true,
  ),
  phoneAuthEnabled: parseBooleanFlag(process.env['AUTH_PHONE_ENABLED'], false),
  otpHmacKey: process.env['AUTH_OTP_HMAC_KEY'],
  smsChallengeTtlSeconds: parseNumberFlag(process.env['AUTH_SMS_CHALLENGE_TTL_SECONDS'], 10 * 60),
  smsResendCooldownSeconds: parseNumberFlag(process.env['AUTH_SMS_RESEND_COOLDOWN_SECONDS'], 60),
  smsMaxInvalidAttempts: parseNumberFlag(process.env['AUTH_SMS_MAX_INVALID_ATTEMPTS'], 5),
  smsMaxConfirmAttemptsPerIpPerHour: parseNumberFlag(process.env['AUTH_SMS_MAX_CONFIRM_ATTEMPTS_PER_IP_PER_HOUR'], 20),
  smsMaxSendsPerPhonePerHour: parseNumberFlag(process.env['AUTH_SMS_MAX_SENDS_PER_PHONE_PER_HOUR'], 3),
  smsMaxSendsPerIpPerHour: parseNumberFlag(process.env['AUTH_SMS_MAX_SENDS_PER_IP_PER_HOUR'], 10),
  emailRegisterMaxAttemptsPerEmailPerHour: parseNumberFlag(process.env['AUTH_EMAIL_REGISTER_MAX_ATTEMPTS_PER_EMAIL_PER_HOUR'], 3),
  emailRegisterMaxAttemptsPerIpPerHour: parseNumberFlag(process.env['AUTH_EMAIL_REGISTER_MAX_ATTEMPTS_PER_IP_PER_HOUR'], 10),
  emailLinkMaxAttemptsPerTargetPerHour: parseNumberFlag(process.env['AUTH_EMAIL_LINK_MAX_ATTEMPTS_PER_TARGET_PER_HOUR'], 3),
  emailLinkMaxAttemptsPerUserPerHour: parseNumberFlag(process.env['AUTH_EMAIL_LINK_MAX_ATTEMPTS_PER_USER_PER_HOUR'], 3),
  emailLinkCooldownSeconds: parseNumberFlag(process.env['AUTH_EMAIL_LINK_COOLDOWN_SECONDS'], 60),
  smsProvider: process.env['AUTH_SMS_PROVIDER'] ?? 'unsupported',
  allowFakeSmsProvider: parseBooleanFlag(process.env['AUTH_SMS_PROVIDER_ALLOW_FAKE'], false),
  fakeSmsCode: rawFakeSmsCode ?? '123456',
  fakeSmsCodeExplicitlySet: rawFakeSmsCode !== undefined && rawFakeSmsCode.trim() !== '',
} as const;
