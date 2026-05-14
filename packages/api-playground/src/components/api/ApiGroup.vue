<script setup lang="ts">
import { computed } from 'vue'
import type { ApiGroup, ApiRoute } from '@/stores/api-doc'
import { formatRateLimit } from '@/utils/api-helpers'
import ApiRouteComponent from './ApiRoute.vue'

interface Props {
  group: ApiGroup
}

const props = defineProps<Props>()

const groupRateLimit = computed(() => formatRateLimit(props.group.rateLimit))

const routes = computed(() => props.group.group.filter((item) => !('group' in item)) as ApiRoute[])
</script>

<template>
  <div
    :id="`group-${group.prefix}`"
    class="group-item bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden fade-in scroll-mt-24"
  >
    <div
      class="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/70 px-4 py-3 border-b border-slate-200 dark:border-slate-700"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 break-words">
              {{ group.description || `Group ${group.prefix}` }}
            </h3>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <div class="flex items-center gap-1.5">
                <span class="font-medium">Prefix:</span>
                <code
                  class="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded text-primary-700 dark:text-primary-400 break-all shadow-sm text-xs"
                >
                  /{{ group.prefix }}
                </code>
              </div>
              <div
                v-if="group.middlewares"
                class="flex items-center gap-1.5"
              >
                <span class="font-medium">Middleware:</span>
                <code
                  class="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded text-orange-700 dark:text-orange-400 break-all shadow-sm text-xs"
                >
                  {{ group.middlewares.join(', ') }}
                </code>
              </div>
              <div
                v-if="groupRateLimit"
                class="flex items-center gap-1.5"
              >
                <span class="font-medium">Rate limit:</span>
                <span
                  class="px-1.5 py-0.5 bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 rounded text-xs font-mono"
                >
                  {{ groupRateLimit.formatted }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="text-right flex-shrink-0">
          <div
            class="text-lg font-bold text-primary-600 dark:text-primary-400"
          >
            {{ routes.length }}
          </div>
          <div class="text-xs text-slate-500 dark:text-slate-400">
            endpoints
          </div>
        </div>
      </div>
    </div>

    <div class="p-4">
      <div class="space-y-3">
        <ApiRouteComponent
          v-for="route in routes"
          :key="route.id"
          :id="`route-${route.id}`"
          :route="route"
          :group-prefix="group.prefix"
        />
      </div>
    </div>
  </div>
</template>
