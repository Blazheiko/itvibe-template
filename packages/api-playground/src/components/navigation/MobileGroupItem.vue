<script setup lang="ts">
import { computed } from 'vue'
import type { ApiGroup, ApiRoute } from '@/stores/api-doc'
import { useApiStore } from '@/stores/api-doc'

interface Props {
  group: ApiGroup
  level: number
  expandedGroups: Set<string>
}

interface Emits {
  (e: 'toggle-group', groupPath: string): void
  (e: 'scroll-to-route', routeId: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const apiStore = useApiStore()

const groupPath = computed(() => {
  return props.group.fullPrefix || props.group.prefix
})

const isExpanded = computed(() => {
  return props.expandedGroups.has(groupPath.value)
})

const toggleGroup = () => {
  emit('toggle-group', groupPath.value)
}

const scrollToRoute = (route: ApiRoute) => {
  // Находим маршрут с правильным ID по fullUrl и method
  const routeWithId = apiStore.findRouteById(route.id)
  if (routeWithId && routeWithId.id) {
    emit('scroll-to-route', routeWithId.id)
  } else {
    console.error(
      'Route not found with fullUrl:',
      route.fullUrl || route.url,
      'method:',
      route.method,
    )
  }
}

// Вспомогательные функции
const isRouteActive = (route: ApiRoute) => {
  const routeWithId = apiStore.findRouteByFullUrl(route.fullUrl || route.url, route.method)
  return routeWithId ? apiStore.isRouteSelected(routeWithId.id) : false
}

const isGroupActive = () => {
  const selectedRoute = apiStore.selectedRoute
  return (selectedRoute && selectedRoute.fullUrl?.startsWith(groupPath.value)) || false
}

const getMethodColor = (method: string) => {
  const colors = {
    GET: 'text-green-600 dark:text-green-400',
    POST: 'text-blue-600 dark:text-blue-400',
    PUT: 'text-yellow-600 dark:text-yellow-400',
    PATCH: 'text-orange-600 dark:text-orange-400',
    DELETE: 'text-red-600 dark:text-red-400',
  }
  return colors[method as keyof typeof colors] || 'text-slate-600 dark:text-slate-400'
}

// Computed для фильтрации маршрутов в группе
const getGroupRoutes = (group: { group: (ApiRoute | ApiGroup)[] }) => {
  return group.group.filter((item): item is ApiRoute => 'url' in item)
}

// Computed для фильтрации вложенных групп
const getNestedGroups = (group: { group: (ApiRoute | ApiGroup)[] }) => {
  return group.group.filter((item): item is ApiGroup => 'group' in item)
}

// Подсчитываем общее количество маршрутов в группе и всех вложенных группах
const totalRoutesCount = computed(() => {
  let count = 0

  function countRoutes(group: ApiGroup) {
    // Считаем маршруты в текущей группе
    count += group.group.filter((item) => !('group' in item)).length

    // Рекурсивно считаем маршруты во вложенных группах
    group.group.forEach((item) => {
      if ('group' in item) {
        countRoutes(item)
      }
    })
  }

  countRoutes(props.group)
  return count
})

const getUrl = (urlInitial: string) => {
  let url = urlInitial
  url = url.replace(props.group.prefix, '') || '/'
  if (url.startsWith('//')) {
    url = url.slice(1)
  }
  return url
}

</script>

<template>
  <div>
    <!-- Group Header -->
    <button
      @click="toggleGroup"
      :class="[
        'w-full flex items-center px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors',
        isGroupActive() ? 'bg-slate-50 dark:bg-slate-800' : '',
      ]"
      :style="{ paddingLeft: `${level * 16 + 16}px` }"
    >
      <svg
        :class="[
          'w-4 h-4 mr-2 text-slate-400 transition-transform flex-shrink-0',
          isExpanded ? 'rotate-90' : '',
        ]"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fill-rule="evenodd"
          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
          clip-rule="evenodd"
        />
      </svg>
      <span class="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
        {{ group.prefix }}
      </span>
      <span class="ml-auto text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
        {{ totalRoutesCount }}
      </span>
    </button>

    <!-- Group Content -->
    <div v-if="isExpanded" class="space-y-0.5">
      <!-- Routes in current group -->
      <template v-for="route in getGroupRoutes(group)" :key="route.id">
        <button
          @click="scrollToRoute(route)"
          :class="[
            'w-full flex items-center px-4 py-1.5 text-left rounded-md transition-colors group',
            isRouteActive(route)
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
          ]"
          :style="{ paddingLeft: `${(level + 1) * 16 + 16}px` }"
        >
          <span
            :class="[
              'text-[10px] font-semibold mr-2 uppercase flex-shrink-0',
              getMethodColor(route.method),
            ]"
          >
            {{ route.method }}
          </span>
          <span class="text-xs truncate font-mono">
            {{ getUrl(route.url) }}
          </span>
        </button>
      </template>

      <!-- Nested groups -->
      <template
        v-for="childGroup in getNestedGroups(group)"
        :key="childGroup.fullPrefix || childGroup.prefix"
      >
        <MobileGroupItem
          :group="childGroup"
          :level="level + 1"
          :expanded-groups="expandedGroups"
          @toggle-group="$emit('toggle-group', $event)"
          @scroll-to-route="$emit('scroll-to-route', $event)"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Дополнительные стили при необходимости */
</style>
