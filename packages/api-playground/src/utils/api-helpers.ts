import type { ArkSchema, RateLimit, RouteParameter } from '@/stores/api-doc'

export function getMethodClass(method: string | undefined): string {
  if (!method) return 'method-unknown'
  return `method-${method.toLowerCase()}`
}

export function getTypeClass(type: string): string {
  const typeClasses: Record<string, string> = {
    string: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    number: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    boolean: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
    enum: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    unknown: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
  }

  return (typeClasses[type] || typeClasses.unknown)!
}

/**
 * Returns a Tailwind CSS class for coloring a field type badge
 * based on the ArkType expression string.
 */
export function getFieldTypeClass(typeExpr: string): string {
  if (typeExpr.startsWith('{')) {
    return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
  }
  if (typeExpr.includes('|')) {
    return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
  }
  if (typeExpr.includes('string')) {
    return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
  }
  if (typeExpr.includes('number')) {
    return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
  }
  if (typeExpr.includes('boolean')) {
    return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
  }
  return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
}

export function extractParameters(url: string): RouteParameter[] {
  const params: RouteParameter[] = []
  const matches = url.match(/:([^/]+)/g)

  if (matches) {
    matches.forEach((match) => {
      params.push({
        name: match.substring(1),
        type: 'path',
        required: true,
      })
    })
  }

  return params
}

export function formatRateLimit(rateLimit?: RateLimit) {
  if (!rateLimit || (!rateLimit.windowMs && !rateLimit.maxRequests)) {
    return null
  }

  const windowMs = rateLimit.windowMs || 0
  const maxRequests = rateLimit.maxRequests || 0

  let timeFormat = ''

  if (windowMs >= 60 * 60 * 1000) {
    const hours = Math.floor(windowMs / (60 * 60 * 1000))
    const minutes = Math.floor((windowMs % (60 * 60 * 1000)) / (60 * 1000))
    timeFormat = hours > 0 ? `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`.trim() : `${minutes}m`
  } else if (windowMs >= 60 * 1000) {
    const minutes = Math.floor(windowMs / (60 * 1000))
    const seconds = Math.floor((windowMs % (60 * 1000)) / 1000)
    timeFormat = `${minutes}m${seconds > 0 ? ` ${seconds}s` : ''}`
  } else if (windowMs >= 1000) {
    const seconds = Math.floor(windowMs / 1000)
    timeFormat = `${seconds}s`
  } else {
    timeFormat = `${windowMs}ms`
  }

  return {
    windowMs,
    maxRequests,
    formatted: `${maxRequests} req/${timeFormat}`,
  }
}

function generateDefaultValue(name: string, typeExpr: string): unknown {
  if (typeExpr.includes('email')) return 'user@example.com'
  if (typeExpr.includes('password')) return 'your_password'
  if (typeExpr.includes('string')) {
    return name.includes('name') ? 'Example Name' : `sample_${name}`
  }
  if (typeExpr.includes('number')) return name.includes('id') ? 1 : 123
  if (typeExpr.includes('boolean')) return true
  return `sample_${name}`
}

export function getDefaultRequestBody(inputSchema: ArkSchema | undefined): string {
  if (inputSchema === undefined) return '{\n  "key": "value"\n}'
  if (inputSchema.fields.length === 0) return '{}'

  const defaultBody: Record<string, unknown> = {}
  for (const field of inputSchema.fields) {
    if (field.required) {
      defaultBody[field.name] = generateDefaultValue(field.name, field.type)
    }
  }

  return JSON.stringify(defaultBody, null, 2)
}

export function validateJSON(jsonString: string): {
  isValid: boolean
  data?: unknown
  error?: string
} {
  if (!jsonString.trim()) {
    return { isValid: true }
  }

  try {
    const parsed = JSON.parse(jsonString)
    return { isValid: true, data: parsed }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON',
    }
  }
}

export function normalizePath(path: string): string {
  if (!path) return '';
  let normalizedPath = path;
  if (normalizedPath.endsWith('/')) normalizedPath = normalizedPath.slice(0, -1);
  if (normalizedPath.startsWith('/')) normalizedPath = normalizedPath.slice(1);
  return normalizedPath;
};
