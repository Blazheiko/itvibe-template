const INVALID_VALUE_WARNED = new Set<string>()

const warnOnce = (key: string, message: string) => {
  if (INVALID_VALUE_WARNED.has(key)) return
  INVALID_VALUE_WARNED.add(key)
  console.warn(message)
}

const formatEnvValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const parseBooleanFlag = (value: unknown, fallback: boolean): boolean => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  if (typeof value === 'boolean') {
    return value
  }

  const normalized = formatEnvValue(value).trim().toLowerCase()
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false
  }

  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true
  }

  return fallback
}

const parseRate = (key: string, value: unknown): number => {
  if (value === undefined || value === null || value === '') {
    return 0
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    warnOnce(key, `[Sentry] Invalid ${key}="${formatEnvValue(value)}" - falling back to 0`)
    return 0
  }

  return parsed
}

const rawDsn = import.meta.env.VITE_SENTRY_DSN?.trim() ?? ''
const enabledByFlag = parseBooleanFlag(import.meta.env.VITE_SENTRY_ENABLED, Boolean(rawDsn))

export const sentryConfig = Object.freeze({
  dsn: rawDsn.length > 0 ? rawDsn : undefined,
  enabled: Boolean(rawDsn) && enabledByFlag,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT?.trim() || import.meta.env.MODE,
  release: import.meta.env.VITE_SENTRY_RELEASE?.trim() || undefined,
  tracesSampleRate: parseRate('VITE_SENTRY_TRACES_SAMPLE_RATE', import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE),
  replaysSessionSampleRate: parseRate(
    'VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE',
    import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
  ),
  replaysOnErrorSampleRate: parseRate(
    'VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE',
    import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
  ),
})

export type SentryConfig = typeof sentryConfig
