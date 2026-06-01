<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useApiStore } from '@/stores/api-doc'
import { useApiTestingStore } from '@/stores/api-testing'
import { useWebSocketConnection } from '@/composables/useWebSocketConnection'
import ApiSettingsModal from '@/components/api/ApiSettingsModal.vue'
import WebSocketModal from '@/components/api/WebSocketModal.vue'

const { isDark, toggleTheme } = useTheme()
const apiStore = useApiStore()
const testingStore = useApiTestingStore()
const { connectionStatus } = useWebSocketConnection()

const isSettingsModalOpen = ref(false)
const isWebSocketModalOpen = ref(false)

const handleSearch = (event: Event) => {
  const target = event.target as HTMLInputElement
  apiStore.setSearchTerm(target.value)
}

const activeRouteLabel = computed(() => {
  const route = testingStore.testingRoute || apiStore.selectedRoute
  if (!route) {
    return 'Browse endpoints and open a dedicated test workspace when needed.'
  }

  return `${route.method.toUpperCase()} ${route.fullUrl || route.url}`
})

const workspaceStatus = computed(() => {
  return testingStore.isModalOpen ? 'Testing workspace open' : 'Documentation mode'
})
</script>

<template>
  <header class="border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur transition-colors duration-300 dark:border-slate-700/80 dark:bg-slate-900/92">
    <div class="w-full px-4 py-3 sm:px-5">
      <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(380px,auto)] xl:items-center">
        <!-- Left: Logo + status + route label -->
        <div class="min-w-0 flex items-center gap-3 flex-wrap">
          <div class="rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 flex-shrink-0">
            API Playground
          </div>
          <div class="rounded-md border border-primary-500/40 bg-primary-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:border-primary-500/40 dark:bg-primary-500/10 dark:text-primary-400 flex-shrink-0">
            {{ workspaceStatus }}
          </div>
          <p class="min-w-0 truncate text-sm text-slate-600 dark:text-slate-300">
            {{ activeRouteLabel }}
          </p>
        </div>

        <!-- Right: Search + actions -->
        <div class="flex items-center gap-2 flex-wrap">
          <label class="relative flex-1 min-w-[200px]">
            <input
              type="text"
              :value="apiStore.searchTerm"
              placeholder="Search endpoints..."
              class="w-full rounded-lg border border-slate-300 bg-white shadow-sm px-3 py-2 pr-8 text-sm text-slate-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400"
              @input="handleSearch"
            />
            <svg class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </label>

          <div class="flex gap-1.5 flex-shrink-0">
            <button
              type="button"
              class="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              @click="isSettingsModalOpen = true"
              title="Settings"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <span class="hidden sm:inline">Settings</span>
            </button>

            <button
              type="button"
              :class="[
                'inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary-500',
                {
                  'border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/40 dark:text-green-200': connectionStatus === 'connected',
                  'border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-200': connectionStatus === 'connecting',
                  'border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200': connectionStatus === 'error',
                  'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200': connectionStatus === 'disconnected',
                },
              ]"
              @click="isWebSocketModalOpen = true"
              title="WebSocket"
            >
              <svg class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path>
              </svg>
              <span class="hidden sm:inline">WS</span>
              <span
                :class="[
                  'inline-block h-2 w-2 rounded-full flex-shrink-0',
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'connecting' ? 'bg-yellow-500' :
                  connectionStatus === 'error' ? 'bg-red-500' : 'bg-slate-400'
                ]"
              ></span>
            </button>

            <button
              type="button"
              class="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              @click="toggleTheme"
              :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            >
              <svg v-if="isDark" class="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
              <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <ApiSettingsModal :is-open="isSettingsModalOpen" @close="isSettingsModalOpen = false" />
      <WebSocketModal :is-open="isWebSocketModalOpen" @close="isWebSocketModalOpen = false" />
    </Teleport>
  </header>
</template>
