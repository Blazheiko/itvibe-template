import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';

export class PhoneNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhoneNormalizationError';
  }
}

export function normalizePhoneNumber(input: string, defaultCountry?: string): string {
  const raw = input.trim();
  if (raw === '') {
    throw new PhoneNormalizationError('Phone number is required');
  }

  const parsed = parsePhoneNumberFromString(raw, defaultCountry as CountryCode | undefined);
  if (parsed?.isValid() !== true) {
    throw new PhoneNormalizationError('Phone number must be valid and in a supported format');
  }

  return parsed.number;
}

export function looksLikePhoneNumber(input: string): boolean {
  return /[+\d][\d()\-\s]{5,}/.test(input.trim());
}
