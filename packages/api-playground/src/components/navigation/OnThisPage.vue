<script setup lang="ts">
import { ref, computed, watch, onMounted, unref } from 'vue'
import { useApiStore } from '@/stores/api-doc'
import { useApiTestingStore } from '@/stores/api-testing'
import type { ApiRoute } from '@/stores/api-doc'

const apiStore = useApiStore()
const testingStore = useApiTestingStore()

interface TocItem {
  id: string
  label: string
  level: number
  method?: string
  routeId?: number
  url?: string
}

const tocItems = ref<TocItem[]>([])
const activeId = ref<string>('')

// Используем готовую плоскую структуру из store
const currentRoutes = computed(() => {
  // Если есть выбранный маршрут (isSelected = true), показываем только его группу
  const selectedRoute = apiStore.filteredFlatRoutes.find((route) => route.isSelected)
  if (selectedRoute) {
    const groupKey = selectedRoute.fullUrl?.split('/').slice(0, -1).join('/') || 'root'

    // Фильтруем маршруты той же группы
    return apiStore.filteredFlatRoutes.filter((route) => {
      const routeGroupKey = route.fullUrl?.split('/').slice(0, -1).join('/') || 'root'
      return routeGroupKey === groupKey
    })
  }

  // Иначе показываем все отфильтрованные маршруты
  return apiStore.filteredFlatRoutes
})

// Computed для группировки маршрутов
const groupedRoutes = computed(() => {
  const groups: { [key: string]: ApiRoute[] } = {}

  currentRoutes.value.forEach((route) => {
    const groupKey = route.fullUrl?.split('/').slice(0, -1).join('/') || 'root'
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(route)
  })

  return groups
})

const getRouteDisplayUrl = (route: ApiRoute, groupPath: string) => {
  const routeUrl = route.url || route.fullUrl

  if (!routeUrl) {
    return null
  }

  if (groupPath === 'root') {
    return routeUrl
  }

  return routeUrl.replace(groupPath, '') || '/'
}

// Генерируем TOC на основе текущих маршрутов
const generateToc = () => {
  const items: TocItem[] = []

  // Создаем TOC элементы
  Object.entries(groupedRoutes.value).forEach(([groupPath, routes]) => {
    // Добавляем группу как заголовок первого уровня
    items.push({
      id: `group-${groupPath}`,
      label: groupPath === 'root' ? 'Root' : groupPath,
      level: 1,
    })

    // Добавляем маршруты как элементы второго уровня
    routes.forEach((route) => {
      if (route.id === undefined || route.id === null) {
        console.error('Route has invalid id:', route)
        return
      }

      const displayUrl = getRouteDisplayUrl(route, groupPath)
      if (!displayUrl) {
        console.error('Route has invalid url:', route)
        return
      }

      items.push({
        id: `route-${route.id}`,
        label: displayUrl,
        method: route.method,
        level: 2,
        routeId: route.id,
        url: route.fullUrl || route.url,
      })
    })
  })

  tocItems.value = items
}

// Скролл к элементу
const selectRoute = async (id: string) => {
  // Если это маршрут, находим его по ID и устанавливаем isSelected
  console.log('selectRoute', id)
  if (id.startsWith('route-')) {
    const routeId = Number(id.replace('route-', ''))

    if (isNaN(routeId)) {
      console.error('Invalid routeId extracted from id:', id)
      return
    }

    const route = apiStore.findRouteById(routeId)

    if (route) {
      // Используем метод store для установки выбранного маршрута
      apiStore.setSelectedRoute(routeId)

      activeId.value = ''
      await apiStore.scrollToRouteWithCollapse(routeId, id)
      return
    } else {
      console.error('Route not found for routeId:', routeId)
    }
  }

  // Для групп используем обычный скролл
  if (id.startsWith('group-')) {
    // Сбрасываем isSelected только для маршрутов в текущем контексте
    apiStore.clearSelectedRoutes(currentRoutes.value)

    activeId.value = id
  }

  const element = document.getElementById(id)
  if (element) {
    // Используем метод из store для консистентности
    apiStore.scrollToElement(id, 100)
  }
}

const getMethodColor = (method: string) => {
  const colors = {
    GET: 'text-green-600 dark:text-green-400',
    POST: 'text-blue-600 dark:text-blue-400',
    PUT: 'text-yellow-600 dark:text-yellow-400',
    PATCH: 'text-orange-600 dark:text-orange-400',
    DELETE: 'text-red-600 dark:text-red-400',
  }
  return colors[method as keyof typeof colors] || 'text-gray-600 dark:text-gray-400'
}

const isRouteTesting = (routeId?: number) => (routeId ? testingStore.isRouteUnderTest(routeId) : false)

watch(
  [currentRoutes, groupedRoutes],
  () => {
    generateToc()
  },
  { immediate: true },
)

// Отслеживаем изменения isSelected для обновления подсветки
watch(
  () => currentRoutes.value.map((route) => route.isSelected),
  () => {
    // Принудительно обновляем подсветку при изменении isSelected
  },
  { immediate: true, deep: true },
)

onMounted(() => {
  generateToc()
})
</script>

<template>
  <aside
    class="w-56 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 h-full flex flex-col"
    role="navigation"
    aria-label="On this page"
  >
    <!-- Header -->
    <div class="px-3 py-3 border-b border-slate-200 dark:border-slate-700">
      <h2 class="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
        On this page
      </h2>
    </div>

    <!-- Table of Contents -->
    <nav class="flex-1 overflow-y-auto p-2">
      <div v-if="tocItems.length === 0" class="text-xs text-slate-500 dark:text-slate-400 px-2 py-4">Empty</div>

      <ul v-else class="space-y-0.5">
        <li v-for="item in tocItems" :key="item.id">
          <button
            @click="selectRoute(item.id)"
            :class="[
              'w-full text-left px-2 py-1.5 rounded-md transition-colors flex items-center gap-1.5',
              item.level === 1 ? 'text-xs font-medium' : 'text-xs font-mono',
              item.level === 2 ? 'ml-3' : '',
              (item.routeId &&
                currentRoutes.find((route) => route.id === item.routeId)?.isSelected) ||
              (item.level === 1 &&
                unref(activeId) === item.id &&
                !currentRoutes.some((route) => route.isSelected))
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
            ]"
          >
            <span v-if="item.method" :class="['font-semibold flex-shrink-0 text-[10px]', getMethodColor(item.method)]">
              {{ item.method }}
            </span>
            <span :class="['truncate', item.level === 2 ? 'block' : '']">
              {{ item.label }}
            </span>
            <span
              v-if="item.routeId && isRouteTesting(item.routeId)"
              class="ml-auto flex-shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
            >
              Lab
            </span>
          </button>
        </li>
      </ul>
    </nav>

    <!-- Stats -->
    <div class="px-3 py-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
      <div class="text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <div class="flex items-center justify-between">
          <span>Groups:</span>
          <span class="font-medium text-slate-900 dark:text-slate-100">
            {{ Object.keys(groupedRoutes).length }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span>Routes:</span>
          <span class="font-medium text-slate-900 dark:text-slate-100">
            {{ currentRoutes.length }}
          </span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* Additional styles if needed */
</style>
