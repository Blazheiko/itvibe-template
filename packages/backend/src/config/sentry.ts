import { env } from "node:process";

import appConfig from "#config/app.js";
import { parseBoolean } from "#vendor/utils/env/parse-boolean.js";

function parseTraceSampleRate(value: string | undefined): number {
  if (value === undefined || value === "") {
    return 0;
  }

  const sampleRate = Number(value);
  if (!Number.isFinite(sampleRate) || sampleRate < 0 || sampleRate > 1) {
    console.warn(
      `[Sentry] Invalid SENTRY_TRACES_SAMPLE_RATE=${value}; falling back to 0`,
    );
    return 0;
  }

  return sampleRate;
}

const dsn = env["SENTRY_DSN"];
const hasDsn = typeof dsn === "string" && dsn.trim() !== "";

const config = Object.freeze({
  dsn: hasDsn ? dsn : undefined,
  enabled: hasDsn && parseBoolean(env["SENTRY_ENABLED"], true),
  environment: env["SENTRY_ENVIRONMENT"] ?? appConfig.env,
  release: env["SENTRY_RELEASE"],
  tracesSampleRate: parseTraceSampleRate(env["SENTRY_TRACES_SAMPLE_RATE"]),
});

export default config;
