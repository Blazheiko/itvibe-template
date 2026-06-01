<script setup lang="ts">
import { computed } from 'vue'
import type { ApiRoute, ArkSchema, SchemaField } from '@/stores/api-doc'
import { useApiStore } from '@/stores/api-doc'
import { useApiTestingStore } from '@/stores/api-testing'
import {
  getJsonSchemaFields,
  getJsonSchemaVariants,
  type JsonSchemaVariant,
} from '@/utils/json-schema-guards'
import {
  extractParameters,
  formatRateLimit,
  getFieldTypeClass,
  getMethodClass,
} from '@/utils/api-helpers'

interface Props {
  route: ApiRoute
  groupPrefix: string
}

const props = defineProps<Props>()

const apiStore = useApiStore()
const testingStore = useApiTestingStore()

const isExpanded = computed(() => apiStore.isRouteExpanded(props.route.id))
const isWebSocket = computed(() => apiStore.currentRouteType === 'ws')
const isSelected = computed(() => apiStore.isRouteSelected(props.route.id))
const isTesting = computed(() => testingStore.isRouteUnderTest(props.route.id))
const parameters = computed(() => extractParameters(props.route.url || ''))
const methodDisplay = computed(() =>
  isWebSocket.value ? 'WS' : (props.route.method || 'UNKNOWN').toUpperCase(),
)
const methodClass = computed(() =>
  isWebSocket.value ? 'method-ws' : getMethodClass(props.route.method),
)
const inputSchema = computed(() => props.route.inputSchema ?? null)
const querySchema = computed(() => props.route.querySchema ?? null)
const outputSchema = computed(() => props.route.outputSchema ?? null)

const isObjectSchema = (type: string) => type.trim().startsWith('{')

const parseObjectSchemaFields = (type: string) => {
  const trimmed = type.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return []
  }

  const content = trimmed.slice(1, -1).trim()
  if (!content) {
    return []
  }

  return content
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf(':')
      if (separatorIndex === -1) {
        return null
      }

      const name = part.slice(0, separatorIndex).trim()
      const valueType = part.slice(separatorIndex + 1).trim()

      return name && valueType ? { name, type: valueType } : null
    })
    .filter((field): field is { name: string; type: string } => Boolean(field))
}

const hasParsedObjectFields = (type: string) =>
  isObjectSchema(type) && parseObjectSchemaFields(type).length > 0

const getSchemaFields = (schema: ArkSchema | null): SchemaField[] => {
  if (schema === null) return []
  if (schema.fields.length > 0) return schema.fields
  return getJsonSchemaFields(schema.jsonSchema)
}

const getSchemaVariants = (schema: ArkSchema | null): JsonSchemaVariant[] => {
  if (schema === null) return []
  return getJsonSchemaVariants(schema.jsonSchema)
}

const hasSchemaContent = (schema: ArkSchema | null): boolean => {
  if (schema === null) return false
  return (
    getSchemaFields(schema).length > 0 ||
    getSchemaVariants(schema).length > 0 ||
    schema.expression.trim().length > 0
  )
}

const shouldShowExpressionFallback = (schema: ArkSchema | null): boolean => {
  if (schema === null) return false
  return getSchemaFields(schema).length === 0 && getSchemaVariants(schema).length === 0
}

const routeRateLimit = computed(() => {
  const rateLimit = props.route.rateLimit || props.route.groupRateLimit
  return formatRateLimit(rateLimit)
})

const toggleExpanded = () => {
  if (props.route.id === undefined || props.route.id === null) {
    return
  }

  apiStore.setSelectedRoute(props.route.id)
  apiStore.setActiveRoute(props.route.id)

  if (isExpanded.value) {
    apiStore.collapseAllRoutes()
  } else {
    apiStore.setExpandedRoute(props.route.id)
  }
}

const openTesting = () => {
  if (props.route.id === undefined || props.route.id === null) {
    return
  }

  if (!isExpanded.value) {
    apiStore.setExpandedRoute(props.route.id)
  }

  testingStore.openTestingModal(props.route.id)
}
</script>

<template>
  <div
    :id="`route-${route.id}`"
    :class="[
      'route-item scroll-mt-24 overflow-hidden rounded-xl border transition-all duration-200',
      'bg-white dark:bg-slate-900/90 shadow-sm',
      isSelected
        ? 'border-primary-600 shadow-[0_0_0_1px_rgba(37,99,235,0.3)]'
        : 'border-slate-200 dark:border-slate-700',
      isTesting
        ? 'ring-1 ring-amber-400 shadow-[0_0_0_1px_rgba(217,119,6,0.3)] dark:ring-amber-600'
        : '',
    ]"
    :data-method="isWebSocket ? 'ws' : route.method"
  >
    <div
      :class="[
        'route-collapsed px-4 py-3 transition-colors duration-200',
        isExpanded
          ? 'bg-slate-50/90 dark:bg-slate-900/90'
          : 'hover:bg-slate-50/90 dark:hover:bg-slate-800/60',
      ]"
      @click="toggleExpanded"
    >
      <div class="flex items-center gap-3">
        <!-- Method + URL + Description -->
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span
              :class="[
                'rounded border px-2 py-0.5 text-xs font-semibold tracking-wider flex-shrink-0',
                methodClass,
              ]"
            >
              {{ methodDisplay }}
            </span>
            <code class="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {{ route.fullUrl }}
            </code>
            <span
              v-if="isTesting"
              class="hidden sm:inline rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200"
            >
              Testing
            </span>
            <span
              v-if="route.inputSchema || route.querySchema"
              class="hidden md:inline rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200"
            >
              Validated
            </span>
            <span
              v-if="routeRateLimit"
              class="hidden md:inline rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
            >
              {{ routeRateLimit.formatted }}
            </span>
          </div>
          <p
            v-if="route.description"
            class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400 line-clamp-1"
          >
            {{ route.description }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            class="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            @click.stop="openTesting"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span class="hidden sm:inline">{{ isWebSocket ? 'WS Lab' : 'Test' }}</span>
          </button>
          <svg
            :class="[
              'h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200',
              { 'rotate-180': isExpanded },
            ]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            ></path>
          </svg>
        </div>
      </div>
    </div>

    <div
      v-show="isExpanded"
      class="route-details expanded border-t border-slate-200/80 px-4 py-4 dark:border-slate-700/80"
    >
      <div class="grid gap-4 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <section class="space-y-3">
          <div
            class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:bg-slate-800/70 dark:border-slate-700"
          >
            <h5
              class="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Operational details
            </h5>
            <div class="space-y-2 text-sm">
              <div v-if="route.middlewares?.length" class="break-words">
                <span class="font-medium text-slate-700 dark:text-slate-200">Middlewares:</span>
                <code class="ml-2 break-all text-orange-600 dark:text-orange-400 text-xs">{{
                  route.middlewares.join(', ')
                }}</code>
              </div>
              <div v-if="routeRateLimit" class="break-words">
                <span class="font-medium text-slate-700 dark:text-slate-200">Rate limit:</span>
                <span
                  class="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-200"
                >
                  {{ routeRateLimit.formatted }}
                </span>
                <span class="ml-2 text-xs text-slate-500 dark:text-slate-400">
                  {{ props.route.rateLimit ? 'route' : 'group' }}
                </span>
              </div>
              <div v-if="parameters.length">
                <h6
                  class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Parameters
                </h6>
                <div class="flex flex-wrap gap-1.5">
                  <div
                    v-for="param in parameters"
                    :key="param.name"
                    class="rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs dark:border-sky-800 dark:bg-sky-950/50"
                  >
                    <div class="font-semibold text-sky-700 dark:text-sky-200">{{ param.name }}</div>
                    <div class="mt-0.5 text-slate-500 dark:text-slate-400">
                      {{ param.type }} · {{ param.required ? 'required' : 'optional' }}
                    </div>
                  </div>
                </div>
              </div>
              <p
                v-if="!route.middlewares?.length && !routeRateLimit && !parameters.length"
                class="text-xs text-slate-400 dark:text-slate-500 italic"
              >
                No additional details
              </p>
            </div>
          </div>

          <div
            class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:bg-slate-800/70 dark:border-slate-700"
          >
            <h5
              class="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Query schema
            </h5>
            <div v-if="hasSchemaContent(querySchema)" class="space-y-1.5">
              <div
                v-for="field in getSchemaFields(querySchema)"
                :key="field.name"
                class="border-l-2 border-emerald-200 pl-2.5 py-1 dark:border-emerald-700"
              >
                <div class="flex flex-wrap items-center gap-1.5 text-xs">
                  <span
                    :class="[
                      'rounded px-1.5 py-0.5 font-mono font-semibold',
                      getFieldTypeClass(field.type),
                    ]"
                  >
                    {{ field.name }}
                  </span>
                  <code class="rounded bg-slate-200 px-1.5 py-0.5 text-xs dark:bg-slate-700">{{
                    field.type
                  }}</code>
                  <span
                    :class="
                      field.required
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-slate-400 dark:text-slate-500'
                    "
                  >
                    {{ field.required ? 'required' : 'optional' }}
                  </span>
                </div>
              </div>
              <div
                v-for="variant in getSchemaVariants(querySchema)"
                :key="`query-${variant.label}`"
                class="rounded-md border border-emerald-200 bg-white/70 p-2 dark:border-emerald-800 dark:bg-slate-900/50"
              >
                <div class="mb-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                  {{ variant.label }}
                </div>
                <div class="space-y-1">
                  <div
                    v-for="field in variant.fields"
                    :key="`query-${variant.label}-${field.name}`"
                    class="flex flex-wrap items-center gap-1.5 text-xs"
                  >
                    <span
                      :class="[
                        'rounded px-1.5 py-0.5 font-mono font-semibold',
                        getFieldTypeClass(field.type),
                      ]"
                    >
                      {{ field.name }}
                    </span>
                    <code class="rounded bg-slate-200 px-1.5 py-0.5 text-xs dark:bg-slate-700">{{
                      field.type
                    }}</code>
                    <span
                      :class="
                        field.required
                          ? 'text-red-500 dark:text-red-400'
                          : 'text-slate-400 dark:text-slate-500'
                      "
                    >
                      {{ field.required ? 'required' : 'optional' }}
                    </span>
                  </div>
                </div>
              </div>
              <pre
                v-if="shouldShowExpressionFallback(querySchema)"
                class="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-200 p-2 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                >{{ querySchema?.expression }}</pre
              >
            </div>
            <p v-else class="text-xs italic text-slate-400 dark:text-slate-500">
              No query schema defined
            </p>
          </div>

          <div
            class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:bg-slate-800/70 dark:border-slate-700"
          >
            <h5
              class="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Request schema
            </h5>
            <div v-if="hasSchemaContent(inputSchema)" class="space-y-1.5">
              <div
                v-for="field in getSchemaFields(inputSchema)"
                :key="field.name"
                class="border-l-2 border-slate-200 pl-2.5 py-1 dark:border-slate-600"
              >
                <div class="flex flex-wrap items-center gap-1.5 text-xs">
                  <span
                    :class="[
                      'rounded px-1.5 py-0.5 font-mono font-semibold',
                      getFieldTypeClass(field.type),
                    ]"
                  >
                    {{ field.name }}
                  </span>
                  <code class="rounded bg-slate-200 px-1.5 py-0.5 text-xs dark:bg-slate-700">{{
                    field.type
                  }}</code>
                  <span
                    :class="
                      field.required
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-slate-400 dark:text-slate-500'
                    "
                  >
                    {{ field.required ? 'required' : 'optional' }}
                  </span>
                </div>
              </div>
              <div
                v-for="variant in getSchemaVariants(inputSchema)"
                :key="`request-${variant.label}`"
                class="rounded-md border border-slate-200 bg-white/70 p-2 dark:border-slate-700 dark:bg-slate-900/50"
              >
                <div class="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {{ variant.label }}
                </div>
                <div class="space-y-1">
                  <div
                    v-for="field in variant.fields"
                    :key="`request-${variant.label}-${field.name}`"
                    class="flex flex-wrap items-center gap-1.5 text-xs"
                  >
                    <span
                      :class="[
                        'rounded px-1.5 py-0.5 font-mono font-semibold',
                        getFieldTypeClass(field.type),
                      ]"
                    >
                      {{ field.name }}
                    </span>
                    <code class="rounded bg-slate-200 px-1.5 py-0.5 text-xs dark:bg-slate-700">{{
                      field.type
                    }}</code>
                    <span
                      :class="
                        field.required
                          ? 'text-red-500 dark:text-red-400'
                          : 'text-slate-400 dark:text-slate-500'
                      "
                    >
                      {{ field.required ? 'required' : 'optional' }}
                    </span>
                  </div>
                </div>
              </div>
              <pre
                v-if="shouldShowExpressionFallback(inputSchema)"
                class="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-200 p-2 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                >{{ inputSchema?.expression }}</pre
              >
            </div>
            <p v-else class="text-xs italic text-slate-400 dark:text-slate-500">
              No request schema defined
            </p>
          </div>
        </section>

        <section class="space-y-3">
          <div
            class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:bg-slate-800/70 dark:border-slate-700"
          >
            <h5
              class="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Response schema
            </h5>
            <div v-if="hasSchemaContent(outputSchema)" class="space-y-1.5">
              <div
                v-for="field in getSchemaFields(outputSchema)"
                :key="field.name"
                class="border-l-2 border-blue-200 pl-2.5 py-1 dark:border-blue-700"
              >
                <div class="flex flex-wrap items-center gap-1.5 text-xs">
                  <span
                    :class="[
                      'rounded px-1.5 py-0.5 font-mono font-semibold',
                      getFieldTypeClass(field.type),
                    ]"
                  >
                    {{ field.name }}
                  </span>
                  <code
                    v-if="!hasParsedObjectFields(field.type)"
                    class="rounded bg-slate-200 px-1.5 py-0.5 text-xs dark:bg-slate-700"
                  >
                    {{ field.type }}
                  </code>
                  <span
                    :class="
                      field.required
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-slate-400 dark:text-slate-500'
                    "
                  >
                    {{ field.required ? 'required' : 'optional' }}
                  </span>
                </div>

                <div
                  v-if="hasParsedObjectFields(field.type)"
                  class="mt-1.5 ml-1 space-y-1 border-l border-slate-200 pl-2.5 dark:border-slate-700"
                >
                  <div
                    v-for="nestedField in parseObjectSchemaFields(field.type)"
                    :key="`${field.name}-${nestedField.name}`"
                    class="flex flex-wrap items-center gap-1.5 text-xs"
                  >
                    <span
                      class="rounded bg-blue-50 px-1.5 py-0.5 font-mono font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200"
                    >
                      {{ nestedField.name }}
                    </span>
                    <code
                      class="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                    >
                      {{ nestedField.type }}
                    </code>
                  </div>
                </div>
              </div>
              <div
                v-for="variant in getSchemaVariants(outputSchema)"
                :key="`response-${variant.label}`"
                class="rounded-md border border-blue-200 bg-white/70 p-2 dark:border-blue-800 dark:bg-slate-900/50"
              >
                <div class="mb-1.5 text-xs font-semibold text-blue-700 dark:text-blue-200">
                  {{ variant.label }}
                </div>
                <div class="space-y-1">
                  <div
                    v-for="field in variant.fields"
                    :key="`response-${variant.label}-${field.name}`"
                    class="flex flex-wrap items-center gap-1.5 text-xs"
                  >
                    <span
                      :class="[
                        'rounded px-1.5 py-0.5 font-mono font-semibold',
                        getFieldTypeClass(field.type),
                      ]"
                    >
                      {{ field.name }}
                    </span>
                    <code class="rounded bg-slate-200 px-1.5 py-0.5 text-xs dark:bg-slate-700">{{
                      field.type
                    }}</code>
                    <span
                      :class="
                        field.required
                          ? 'text-red-500 dark:text-red-400'
                          : 'text-slate-400 dark:text-slate-500'
                      "
                    >
                      {{ field.required ? 'required' : 'optional' }}
                    </span>
                  </div>
                </div>
              </div>
              <pre
                v-if="shouldShowExpressionFallback(outputSchema)"
                class="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-200 p-2 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                >{{ outputSchema?.expression }}</pre
              >
            </div>
            <p v-else class="text-xs italic text-slate-400 dark:text-slate-500">
              No response schema defined
            </p>
          </div>

          <div
            class="rounded-xl border border-dashed border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <h5
                  class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Testing workspace
                </h5>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Execute requests in a fullscreen workspace.
                </p>
              </div>
              <button
                type="button"
                class="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                @click="openTesting"
              >
                Launch
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
