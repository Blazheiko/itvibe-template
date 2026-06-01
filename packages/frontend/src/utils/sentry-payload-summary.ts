import { sentryService } from '@/utils/sentry-service'

export const summarizePayload = (payload: unknown): string => {
  if (payload === null) return 'null'
  if (payload === undefined) return 'undefined'
  if (typeof payload === 'string') return `string(${payload.length})`
  if (typeof payload === 'number' || typeof payload === 'boolean') return String(payload)
  if (Array.isArray(payload)) return `array(${payload.length})`
  if (typeof payload !== 'object') return typeof payload

  const allKeys = Object.keys(payload)
  const keys = allKeys.slice(0, 8)
  return `object(${keys.join(',')}${allKeys.length > 8 ? ',…' : ''})`
}

export const reportValidationFailure = (
  wsEvent: string,
  validationPhase: string,
  payload: unknown,
): void => {
  sentryService.captureMessage('ws_payload_validation_failed', 'warning', {
    tags: { wsEvent },
    extra: {
      validationPhase,
      payloadSummary: summarizePayload(payload),
    },
  })
}
