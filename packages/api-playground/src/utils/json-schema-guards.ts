export interface JsonSchemaObject {
  anyOf?: JsonSchemaObject[]
  properties?: Record<string, JsonSchemaObject>
  required?: string[]
  const?: string | number | boolean | null
  enum?: (string | number | boolean | null)[]
  type?: string | string[]
  format?: string
  items?: JsonSchemaObject
}

export interface JsonSchemaField {
  name: string
  type: string
  required: boolean
}

export interface JsonSchemaVariant {
  label: string
  fields: JsonSchemaField[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPrimitiveLiteral(value: unknown): value is string | number | boolean | null {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  )
}

function asJsonSchemaObject(value: unknown): JsonSchemaObject | null {
  if (!isRecord(value)) return null

  const schema: JsonSchemaObject = {}

  if (Array.isArray(value.anyOf)) {
    schema.anyOf = value.anyOf
      .map(asJsonSchemaObject)
      .filter((item): item is JsonSchemaObject => item !== null)
  }

  if (isRecord(value.properties)) {
    const properties: Record<string, JsonSchemaObject> = {}
    for (const [key, property] of Object.entries(value.properties)) {
      const propertySchema = asJsonSchemaObject(property)
      if (propertySchema !== null) {
        properties[key] = propertySchema
      }
    }
    schema.properties = properties
  }

  if (Array.isArray(value.required)) {
    schema.required = value.required.filter((item): item is string => typeof item === 'string')
  }

  if ('const' in value && isPrimitiveLiteral(value.const)) {
    schema.const = value.const
  }

  if (Array.isArray(value.enum)) {
    schema.enum = value.enum.filter(isPrimitiveLiteral)
  }

  if (typeof value.type === 'string') {
    schema.type = value.type
  } else if (Array.isArray(value.type)) {
    schema.type = value.type.filter((item): item is string => typeof item === 'string')
  }

  if (typeof value.format === 'string') {
    schema.format = value.format
  }

  const items = asJsonSchemaObject(value.items)
  if (items !== null) {
    schema.items = items
  }

  return schema
}

function literalLabel(schema: JsonSchemaObject): string | null {
  if (schema.const !== undefined) return String(schema.const)
  if (schema.enum !== undefined && schema.enum.length === 1) return String(schema.enum[0])
  return null
}

function describeType(schema: JsonSchemaObject): string {
  const literal = literalLabel(schema)
  if (literal !== null) return JSON.stringify(literal)

  if (schema.anyOf !== undefined && schema.anyOf.length > 0) {
    return schema.anyOf.map(describeType).join(' | ')
  }

  const baseType = Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type
  if (baseType === 'array' && schema.items !== undefined) {
    return `${describeType(schema.items)}[]`
  }

  if (baseType !== undefined && schema.format !== undefined) {
    return `${baseType}.${schema.format}`
  }

  if (baseType !== undefined) return baseType
  if (schema.properties !== undefined) return 'object'
  return 'unknown'
}

export function getJsonSchemaFields(jsonSchema: unknown): JsonSchemaField[] {
  const schema = asJsonSchemaObject(jsonSchema)
  if (schema?.properties === undefined) return []

  const required = new Set(schema.required ?? [])
  return Object.entries(schema.properties).map(([name, property]) => ({
    name,
    type: describeType(property),
    required: required.has(name),
  }))
}

function variantLabel(schema: JsonSchemaObject, index: number): string {
  const required = new Set(schema.required ?? [])
  const properties = schema.properties ?? {}

  for (const [name, property] of Object.entries(properties)) {
    if (!required.has(name)) continue
    const label = literalLabel(property)
    if (label !== null) return label
  }

  const firstRequiredField = Object.keys(properties).find((name) => required.has(name))
  if (firstRequiredField !== undefined) return firstRequiredField

  return `Variant ${index + 1}`
}

export function getJsonSchemaVariants(jsonSchema: unknown): JsonSchemaVariant[] {
  const schema = asJsonSchemaObject(jsonSchema)
  if (schema?.anyOf === undefined) return []

  return schema.anyOf.map((branch, index) => ({
    label: variantLabel(branch, index),
    fields: getJsonSchemaFields(branch),
  }))
}
