<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useApiStore, type ApiGroup, type ApiRoute } from '@/stores/api-doc'
import TreeGroup from './TreeGroup.vue'

const apiStore = useApiStore()

const expandedGroups = ref<Set<string>>(new Set()) // Changed to strings to support nesting

const currentGroups = computed(() => apiStore.filteredTreeGroups)

const toggleGroup = (groupPath: string) => {
  if (expandedGroups.value.has(groupPath)) {
    expandedGroups.value.delete(groupPath)
  } else {
    expandedGroups.value.add(groupPath)
  }
}

const scrollToRoute = async (id: number) => {
  // Find route in flat list to get ID
  const route = apiStore.findRouteById(id)
  if (route) {
    apiStore.setSelectedRoute(route.id)
    await apiStore.scrollToRouteWithCollapse(route.id)
  }
}

// Automatically expand group with selected route
watch(
  () => apiStore.selectedRouteId,
  (selectedRouteId) => {
    if (selectedRouteId) {
      // Find all groups that contain the selected route
      function findGroupsWithRoute(groups: ApiGroup[], routeId: number, parentPath = ''): string[] {
        const foundPaths: string[] = []

        for (const group of groups) {
          const currentPath = parentPath ? `${parentPath}/${group.prefix}` : group.prefix

          // Check if route exists in this group (recursively)
          function hasRouteInGroup(groupItems: (ApiRoute | ApiGroup)[]): boolean {
            for (const item of groupItems) {
              if ('group' in item) {
                if (hasRouteInGroup(item.group)) return true
              } else {
                if (item.id === routeId) return true
              }
            }
            return false
          }

          if (hasRouteInGroup(group.group)) {
            foundPaths.push(currentPath)
            // Also search in nested groups
            const nestedPaths = findGroupsWithRoute(
              group.group.filter((item): item is ApiGroup => 'group' in item),
              routeId,
              currentPath,
            )
            foundPaths.push(...nestedPaths)
          }
        }

        return foundPaths
      }

      const groupPaths = findGroupsWithRoute(currentGroups.value, selectedRouteId)
      groupPaths.forEach((path) => {
        expandedGroups.value.add(path)
      })
    }
  },
  { immediate: true },
)
</script>

<template>
  <nav
    class="w-56 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 h-full flex flex-col"
    role="navigation"
    aria-label="API Routes"
  >
    <!-- Header -->
    <div class="px-3 py-3 border-b border-slate-200 dark:border-slate-700">
      <h2
        class="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2"
      >
        API Routes
      </h2>

      <!-- Route Type Tabs -->
      <div class="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
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

    <!-- Navigation Tree -->
    <div class="flex-1 overflow-y-auto py-1">
      <div v-if="currentGroups.length === 0" class="px-4 py-8 text-center">
        <p class="text-sm text-slate-500 dark:text-slate-400">No routes available</p>
      </div>

      <div v-else class="space-y-0.5">
        <TreeGroup
          v-for="(group, index) in currentGroups"
          :key="`${index}_${group.prefix}`"
          :group="group"
          :expanded-groups="expandedGroups"
          :level="0"
          @toggle-group="toggleGroup"
          @scroll-to-route="scrollToRoute"
        />
      </div>
    </div>
  </nav>
</template>

<style scoped></style>
