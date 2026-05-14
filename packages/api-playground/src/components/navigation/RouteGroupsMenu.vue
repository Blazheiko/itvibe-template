<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useApiStore, type ApiRoute } from '@/stores/api-doc'

const router = useRouter()
const apiStore = useApiStore()

const expandedGroups = ref<Set<number>>(new Set())
const expandedRoutes = ref<Set<string>>(new Set())

const currentGroups = computed(() => apiStore.centralGroups)

const toggleGroup = (index: number) => {
  if (expandedGroups.value.has(index)) {
    expandedGroups.value.delete(index)
  } else {
    expandedGroups.value.add(index)
  }
}

const toggleRoute = (routeKey: string) => {
  if (expandedRoutes.value.has(routeKey)) {
    expandedRoutes.value.delete(routeKey)
  } else {
    expandedRoutes.value.add(routeKey)
  }
}

const navigateToRoute = (routeId: number) => {
  const route = apiStore.findRouteById(routeId)
  if (route) {
    apiStore.setSelectedRoute(routeId)
    apiStore.setActiveRoute(routeId)
    router.push(`/route/${routeId}`)
  }
}

const getMethodColor = (method: string) => {
  const colors = {
    GET: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    PUT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    PATCH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    OPTIONS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    HEAD: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  }
  return (
    colors[method as keyof typeof colors] ||
    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  )
}

const getRouteKey = (routeId: number) => {
  return `route-${routeId}`
}

const expandAllGroups = () => {
  currentGroups.value.forEach((_, index) => {
    expandedGroups.value.add(index)
  })
}

const collapseAllGroups = () => {
  expandedGroups.value.clear()
  expandedRoutes.value.clear()
}

const isRouteActive = (routeId: number) => {
  return apiStore.isRouteSelected(routeId)
}
</script>

<template>
  <aside
    class="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full overflow-y-auto"
  >
    <!-- Header -->
    <div class="p-6 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Группы маршрутов</h2>
        <div class="flex gap-2">
          <button
            @click="expandAllGroups"
            class="px-3 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
          >
            Развернуть
          </button>
          <button
            @click="collapseAllGroups"
            class="px-3 py-1 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Свернуть
          </button>
        </div>
      </div>

      <!-- Route Type Tabs -->
      <div class="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          @click="apiStore.setRouteType('http')"
          :class="[
            'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
            apiStore.currentRouteType === 'http'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
          ]"
        >
          HTTP Routes
        </button>
        <button
          @click="apiStore.setRouteType('ws')"
          :class="[
            'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
            apiStore.currentRouteType === 'ws'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
          ]"
        >
          WS Routes
        </button>
      </div>
    </div>

    <!-- Groups List -->
    <div class="p-4 space-y-3">
      <div
        v-for="(group, groupIndex) in currentGroups"
        :key="groupIndex"
        class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
      >
        <!-- Group Header -->
        <button
          @click="toggleGroup(groupIndex)"
          class="w-full p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-gray-900 dark:text-gray-100 truncate">
                {{ group.prefix }}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {{ group.description }}
              </p>
              <div class="flex items-center gap-2 mt-2">
                <span
                  class="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded"
                >
                  {{ group.group.length }} маршрутов
                </span>
                <span
                  v-if="group.middlewares?.length"
                  class="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-2 py-1 rounded"
                >
                  {{ group.middlewares.join(', ') }}
                </span>
              </div>
            </div>
            <svg
              :class="[
                'w-5 h-5 text-gray-400 transition-transform',
                expandedGroups.has(groupIndex) ? 'rotate-180' : '',
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
              />
            </svg>
          </div>
        </button>

        <!-- Group Routes -->
        <div
          v-if="expandedGroups.has(groupIndex)"
          class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
        >
          <div
            v-for="(route, routeIndex) in group.group.filter((item) => 'url' in item)"
            :key="routeIndex"
            class="border-b border-gray-100 dark:border-gray-700 last:border-b-0"
          >
            <!-- Route Header -->
            <button
              @click="toggleRoute(getRouteKey((route as ApiRoute).id))"
              :class="[
                'w-full p-3 transition-colors text-left',
                isRouteActive((route as ApiRoute).id)
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700',
              ]"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    :class="[
                      'px-2 py-1 text-xs font-medium rounded',
                      getMethodColor((route as ApiRoute).method),
                    ]"
                  >
                    {{ (route as ApiRoute).method }}
                  </span>
                  <span class="text-sm text-gray-900 dark:text-gray-100 truncate font-mono">
                    {{ (route as ApiRoute).url }}
                  </span>
                </div>
                <svg
                  :class="[
                    'w-4 h-4 text-gray-400 transition-transform',
                    expandedRoutes.has(getRouteKey((route as ApiRoute).id)) ? 'rotate-180' : '',
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
                  />
                </svg>
              </div>
              <p
                v-if="route.description"
                class="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate"
              >
                {{ route.description }}
              </p>
            </button>

            <!-- Route Details -->
            <div
              v-if="expandedRoutes.has(getRouteKey((route as ApiRoute).id))"
              class="px-3 pb-3 bg-gray-50 dark:bg-gray-700"
            >
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-600 dark:text-gray-400">URL:</span>
                  <span class="text-xs font-mono text-gray-900 dark:text-gray-100">
                    {{ (route as ApiRoute).url }}
                  </span>
                </div>

                <div v-if="(route as ApiRoute).inputSchema" class="flex items-center justify-between">
                  <span class="text-xs text-gray-600 dark:text-gray-400">Validated:</span>
                  <span
                    class="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-1 rounded"
                  >
                    {{ (route as ApiRoute).inputSchema!.fields.length }} fields
                  </span>
                </div>

                <div v-if="(route as ApiRoute).rateLimit" class="flex items-center justify-between">
                  <span class="text-xs text-gray-600 dark:text-gray-400">Rate Limit:</span>
                  <span
                    class="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-2 py-1 rounded"
                  >
                    {{ (route as ApiRoute).rateLimit!.maxRequests }}/{{
                      Math.round((route as ApiRoute).rateLimit!.windowMs / 60000)
                    }}m
                  </span>
                </div>

                <button
                  @click="navigateToRoute((route as ApiRoute).id)"
                  class="w-full mt-3 px-3 py-2 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors"
                >
                  Открыть детали
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="currentGroups.length === 0" class="text-center py-8">
        <div class="text-gray-400 dark:text-gray-500 mb-2">📋</div>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ apiStore.searchTerm ? 'Маршруты не найдены' : 'Нет доступных групп' }}
        </p>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* Дополнительные стили при необходимости */
</style>
