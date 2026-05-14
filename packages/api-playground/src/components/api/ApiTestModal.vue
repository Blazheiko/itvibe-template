<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, watch } from 'vue'
import { useApiTestingStore } from '@/stores/api-testing'
import { useApiStore } from '@/stores/api-doc'
import { useApiSettingsStore } from '@/stores/api-settings'
import TestForm from './TestForm.vue'
import TestFormWs from './TestFormWs.vue'

const testingStore = useApiTestingStore()
const apiStore = useApiStore()
const apiSettingsStore = useApiSettingsStore()

const currentRoute = computed(() => testingStore.testingRoute)
const isWebSocket = computed(() => apiStore.currentRouteType === 'ws')
const modalTitleId = 'api-test-modal-title'
let lastFocusedElement: HTMLElement | null = null

const routeSubtitle = computed(() => {
  if (!currentRoute.value) {
    return ''
  }

  return currentRoute.value.description || 'Interactive testing workspace'
})

const closeModal = () => {
  testingStore.closeTestingModal()
}

const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    closeModal()
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && testingStore.isModalOpen) {
    closeModal()
  }
}

watch(
  () => testingStore.isModalOpen,
  async (isOpen) => {
    if (typeof document === 'undefined') {
      return
    }

    if (isOpen) {
      lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
      document.body.classList.add('api-modal-open')

      await nextTick()
      const target = document.querySelector<HTMLElement>('[data-test-modal-autofocus]')
      target?.focus()
      return
    }

    document.body.classList.remove('api-modal-open')
    lastFocusedElement?.focus()
    lastFocusedElement = null
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.body.classList.remove('api-modal-open')
  }
  window.removeEventListener('keydown', handleKeydown)
})

watch(
  () => testingStore.isModalOpen,
  (isOpen) => {
    if (typeof window === 'undefined') {
      return
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeydown)
    } else {
      window.removeEventListener('keydown', handleKeydown)
    }
  },
  { immediate: true },
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="testingStore.isModalOpen && currentRoute"
      class="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="modalTitleId"
      @click="handleBackdropClick"
    >
      <div
        class="flex h-full w-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
        @click.stop
      >
        <!-- Modal Header -->
        <header
          class="sticky top-0 z-10 border-b border-slate-200/80 bg-white/92 px-4 py-2.5 shadow-sm backdrop-blur md:px-5 dark:border-slate-700/80 dark:bg-slate-950/90"
        >
          <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <!-- Left: Close + Route info -->
            <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
                data-test-modal-autofocus
                @click="closeModal"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Close
              </button>
              <span
                :class="[
                  'rounded border px-2 py-1 text-xs font-semibold uppercase tracking-wider',
                  isWebSocket
                    ? 'border-cyan-300 bg-cyan-100/80 text-cyan-800 dark:border-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-200'
                    : 'border-emerald-300 bg-emerald-100/80 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200',
                ]"
              >
                {{ isWebSocket ? 'WebSocket' : 'HTTP' }}
              </span>
              <span
                class="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                {{ currentRoute.method }}
              </span>
              <h2
                :id="modalTitleId"
                class="min-w-0 truncate text-sm font-semibold"
              >
                {{ currentRoute.fullUrl || currentRoute.url }}
              </h2>
              <span v-if="routeSubtitle" class="hidden text-slate-400 lg:inline">·</span>
              <p class="hidden min-w-0 truncate text-xs text-slate-500 dark:text-slate-400 lg:block">
                {{ routeSubtitle }}
              </p>
            </div>

            <!-- Right: Base URL info -->
            <div
              class="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/70"
            >
              <div>
                <div class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Base URL
                </div>
                <div class="mt-0.5 break-all text-xs font-medium leading-4">
                  {{ apiSettingsStore.baseUrl }}
                </div>
                <div
                  v-if="apiSettingsStore.hasBaseUrlOverride"
                  class="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-300"
                >
                  Session override
                </div>
              </div>
            </div>
          </div>
        </header>

        <!-- Modal Body -->
        <div class="test-workspace-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
          <TestForm
            v-if="!isWebSocket"
            :route="currentRoute"
            :group-prefix="currentRoute.fullUrl?.split('/').slice(0, -1).join('/') || ''"
            in-modal
          />
          <TestFormWs
            v-else
            :route="currentRoute"
            :group-prefix="currentRoute.fullUrl?.split('/').slice(0, -1).join('/') || ''"
            in-modal
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>
