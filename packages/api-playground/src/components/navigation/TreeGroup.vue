<script setup lang="ts">
import { computed } from 'vue'
import type { ApiGroup, ApiRoute } from '@/stores/api-doc'
import { useApiStore } from '@/stores/api-doc'
import { useApiTestingStore } from '@/stores/api-testing'

interface Props {
  group: ApiGroup
  expandedGroups: Set<string>
  level: number
}

interface Emits {
  (e: 'toggle-group', groupPath: string): void
  (e: 'scroll-to-route', id: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const apiStore = useApiStore()
const testingStore = useApiTestingStore()

const groupPath = computed(() => props.group.fullPrefix || props.group.prefix)
const isExpanded = computed(() => props.expandedGroups.has(groupPath.value))

const toggleGroup = () => emit('toggle-group', groupPath.value)

const getUrl = (urlInitial: string) => {
  let url = urlInitial.replace(props.group.prefix, '') || '/'
  if (url.startsWith('//')) {
    url = url.slice(1)
  }
  return url
}

const scrollToRoute = (route: ApiRoute) => {
  if (route.id) {
    emit('scroll-to-route', route.id)
  }
}

const isRouteActive = (route: ApiRoute) => route.id ? apiStore.isRouteSelected(route.id) : false
const isRouteTesting = (route: ApiRoute) => route.id ? testingStore.isRouteUnderTest(route.id) : false

const isGroupActive = () => {
  const selectedRouteId = apiStore.selectedRouteId
  if (!selectedRouteId) return false

  function hasRouteInGroup(group: ApiGroup, routeId: number): boolean {
    for (const item of group.group) {
      if ('group' in item) {
        if (hasRouteInGroup(item, routeId)) return true
      } else if (item.id === routeId) {
        return true
      }
    }
    return false
  }

  return hasRouteInGroup(props.group, selectedRouteId)
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

const totalRoutesCount = computed(() => {
  let count = 0

  function countRoutes(group: ApiGroup) {
    count += group.group.filter((item) => !('group' in item)).length
    group.group.forEach((item) => {
      if ('group' in item) countRoutes(item)
    })
  }

  countRoutes(props.group)
  return count
})
</script>

<template>
  <div>
    <button
      :class="[
        'flex w-full items-center px-4 py-2 text-left transition-colors',
        isGroupActive() ? 'bg-primary-50/80 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800',
      ]"
      :style="{ paddingLeft: `${level * 16 + 16}px` }"
      @click="toggleGroup"
    >
      <svg :class="['mr-2 h-4 w-4 flex-shrink-0 text-slate-400 transition-transform', isExpanded ? 'rotate-90' : '']" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
      </svg>
      <span class="truncate text-sm font-medium">{{ group.prefix }}</span>
      <span class="ml-auto flex-shrink-0 text-xs text-slate-500 dark:text-slate-400">{{ totalRoutesCount }}</span>
    </button>

    <div v-if="isExpanded" class="space-y-0.5">
      <template v-for="(item, index) in group.group" :key="index">
        <button
          v-if="item && !('group' in item)"
          :class="[
            'group flex w-full items-center rounded-xl px-4 py-2 text-left transition-colors',
            isRouteActive(item as ApiRoute)
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
              : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
          ]"
          :style="{ paddingLeft: `${(level + 1) * 16 + 16}px` }"
          @click="scrollToRoute(item as ApiRoute)"
        >
          <span :class="['mr-2 text-[10px] font-semibold uppercase', getMethodColor((item as ApiRoute).method)]">
            {{ (item as ApiRoute).method }}
          </span>
          <span class="truncate font-mono text-xs">
            {{ getUrl((item as ApiRoute).url) }}
          </span>
          <span
            v-if="isRouteTesting(item as ApiRoute)"
            class="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
          >
            Lab
          </span>
        </button>
      </template>

      <template v-for="childGroup in group.group" :key="childGroup">
        <TreeGroup
          v-if="childGroup && 'group' in childGroup"
          :group="childGroup as ApiGroup"
          :expanded-groups="expandedGroups"
          :level="level + 1"
          @toggle-group="$emit('toggle-group', $event)"
          @scroll-to-route="$emit('scroll-to-route', $event)"
        />
      </template>
    </div>
  </div>
</template>
