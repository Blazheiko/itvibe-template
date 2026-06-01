import { env } from 'node:process';

function parseBooleanFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return value === '1' || value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' || value.toLowerCase() === 'on';
}

function parseList(value: string | undefined): readonly string[] {
  if (value === undefined || value.trim() === '') {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export const networkConfig = Object.freeze({
  trustProxy: parseBooleanFlag(env['TRUST_PROXY'], false),
  trustedProxyCidrs: parseList(env['TRUSTED_PROXY_CIDRS']),
});
