import type { AppErrorResponse } from 'shared'

function normalizeApiBaseUrl(value: string | undefined) {
  if (value === undefined || value === '') {
    return '/api'
  }

  if (value === '/') {
    return ''
  }

  return value.replace(/\/$/, '')
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

export class ApiError<TResponse = unknown> extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly response: TResponse,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function formatApiError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return `${error.message} (${error.statusCode})`
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export interface RequestOptions<TBody = undefined, TQuery = undefined> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  body?: TBody
  query?: TQuery
}

function buildUrl<TQuery>(path: string, query?: TQuery) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${API_BASE_URL}${normalizedPath}`, window.location.origin)

  if (query && typeof query === 'object') {
    for (const [key, rawValue] of Object.entries(query)) {
      // Empty strings are omitted intentionally so optional query fields do not
      // produce ?key= noise. If the backend must distinguish empty vs missing,
      // pass a non-empty sentinel value instead.
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        continue
      }

      if (Array.isArray(rawValue)) {
        for (const value of rawValue) {
          url.searchParams.append(key, String(value))
        }
        continue
      }

      url.searchParams.set(key, String(rawValue))
    }
  }

  return url.toString()
}

function isApiErrorResponse(value: unknown): value is AppErrorResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  return 'status' in value && value.status === 'error' && 'message' in value
}

export async function requestJson<TResponse, TBody = undefined, TQuery = undefined>({
  method,
  path,
  body,
  query,
}: RequestOptions<TBody, TQuery>): Promise<TResponse> {
  const response = await fetch(buildUrl(path, query), {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const rawPayload = await response.text()
  let payload = {} as TResponse

  if (rawPayload !== '') {
    try {
      payload = JSON.parse(rawPayload) as TResponse
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to parse API response',
        response.status,
        rawPayload,
      )
    }
  }

  if (!response.ok || isApiErrorResponse(payload)) {
    const message =
      isApiErrorResponse(payload) && payload.message
        ? payload.message
        : `Request failed with status ${response.status}`

    throw new ApiError(message, response.status, payload)
  }

  return payload
}

export function createApiPath(path: string, query?: Record<string, string | number | boolean | undefined>) {
  return buildUrl(path, query)
}
