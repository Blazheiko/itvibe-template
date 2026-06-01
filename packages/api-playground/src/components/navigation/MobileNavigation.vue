<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useApiStore } from '@/stores/api-doc'
import type { ApiGroup } from '@/stores/api-doc'
import MobileGroupItem from './MobileGroupItem.vue'

const apiStore = useApiStore()

const isOpen = ref(false)
const expandedGroups = ref<Set<string>>(new Set()) // Изменили на строки для поддержки вложенности

const currentGroups = computed(() => apiStore.filteredTreeGroups) // Используем древовидную структуру

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}

const closeMenu = () => {
  isOpen.value = false
}

const toggleGroup = (groupPath: string) => {
  if (expandedGroups.value.has(groupPath)) {
    expandedGroups.value.delete(groupPath)
  } else {
    expandedGroups.value.add(groupPath)
  }
}

const scrollToRoute = async (routeId: number) => {
  const route = apiStore.findRouteById(routeId)
  if (route) {
    apiStore.setSelectedRoute(routeId)
    await apiStore.scrollToRouteWithCollapse(routeId)
  }
  closeMenu()
}

// Вспомогательные функции для древовидной структуры
const getGroupPath = (group: ApiGroup) => {
  return group.fullPrefix || group.prefix
}

// Автоматически разворачиваем группу с выбранным маршрутом
watch(
  () => apiStore.selectedRoute,
  (newRoute) => {
    if (newRoute) {
      // Находим группу, содержащую выбранный маршрут
      const groupPath = newRoute.fullUrl?.split('/').slice(0, -1).join('/') || ''
      if (groupPath) {
        expandedGroups.value.add(groupPath)
      }
    }
  },
  { immediate: true },
)
</script>

<template>
  <!-- Mobile Menu Button -->
  <button
    @click="toggleMenu"
    aria-label="Open navigation menu"
    class="xl:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
  >
    <svg
      class="w-5 h-5 text-slate-600 dark:text-slate-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  </button>

  <!-- Mobile Menu Overlay -->
  <div
    v-if="isOpen"
    class="xl:hidden fixed inset-0 z-40 bg-slate-950/60 transition-opacity"
    @click="closeMenu"
  ></div>

  <!-- Mobile Menu Panel -->
  <div
    :class="[
      'xl:hidden fixed top-0 left-0 z-50 w-72 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 ease-in-out flex flex-col',
      isOpen ? 'translate-x-0' : '-translate-x-full',
    ]"
  >
    <!-- Header -->
    <div class="px-3 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          API Routes
        </h2>
        <button
          @click="closeMenu"
          class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close navigation menu"
        >
          <svg
            class="w-4 h-4 text-slate-600 dark:text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Route Type Tabs -->
      <div class="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 mt-2">
        <button
          @click="apiStore.setRouteType('http')"
          :class="[
            'flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
            apiStore.currentRouteType === 'http'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
          ]"
        >
          HTTP
        </button>
        <button
          @click="apiStore.setRouteType('ws')"
          :class="[
            'flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
            apiStore.currentRouteType === 'ws'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
          ]"
        >
          WebSocket
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto py-1">
      <div v-if="currentGroups.length === 0" class="px-4 py-8 text-center">
        <p class="text-sm text-slate-500 dark:text-slate-400">No routes available</p>
      </div>

      <div v-else class="space-y-0.5">
        <template v-for="(group, index) in currentGroups" :key="`${index}_${getGroupPath(group)}`">
          <MobileGroupItem
            :group="group"
            :level="0"
            :expanded-groups="expandedGroups"
            @toggle-group="toggleGroup"
            @scroll-to-route="scrollToRoute"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Дополнительные стили при необходимости */
</style>
