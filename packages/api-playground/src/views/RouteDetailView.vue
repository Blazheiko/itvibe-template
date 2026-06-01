<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApiStore } from '@/stores/api-doc'
import ApiHeader from '@/components/api/ApiHeader.vue'
import ApiRoute from '@/components/api/ApiRoute.vue'

const route = useRoute()
const router = useRouter()
const apiStore = useApiStore()

const routeId = computed(() => {
  const paramValue = route.params.routeId

  if (typeof paramValue !== 'string') {
    console.error('routeId param is not a string:', paramValue)
    return 0
  }

  const id = Number(paramValue)

  if (isNaN(id)) {
    console.error('routeId param is not a valid number:', paramValue)
    return 0
  }

  return id
})

const currentRoute = computed(() => {
  return apiStore.findRouteById(routeId.value)
})

onMounted(async () => {
  if (apiStore.httpRouteGroups.length === 0) {
    await apiStore.fetchRoutes()
  }

  // Check if route exists and routeId is valid
  if (!currentRoute.value || routeId.value === 0) {
    router.push('/')
  } else {
    // Устанавливаем selectedRoute для корректной подсветки в навигации
    apiStore.setSelectedRoute(routeId.value)
    apiStore.setActiveRoute(routeId.value)
  }
})

const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
    <ApiHeader />

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back Button -->
      <button
        @click="goBack"
        class="mb-6 flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          ></path>
        </svg>
        Back to all routes
      </button>

      <!-- Route Details -->
      <div v-if="currentRoute">
        <div class="mb-4">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {{ currentRoute.description || 'Route Details' }}
          </h2>
          <p class="text-gray-600 dark:text-gray-400">Route ID: {{ currentRoute.id }}</p>
        </div>

        <ApiRoute
          :route="currentRoute"
          :group-prefix="currentRoute.fullUrl?.split('/').slice(0, -1).join('/') || ''"
        />
      </div>

      <!-- Loading State -->
      <div
        v-else-if="apiStore.isLoading"
        class="bg-white dark:bg-gray-800 rounded-lg p-8 text-center"
      >
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"
        ></div>
        <p class="text-gray-600 dark:text-gray-400">Loading route details...</p>
      </div>

      <!-- Not Found -->
      <div v-else class="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
        <svg
          class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Route not found</h3>
        <p class="text-gray-600 dark:text-gray-400">The route you're looking for doesn't exist.</p>
        <button
          @click="goBack"
          class="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
        >
          Go back
        </button>
      </div>
    </main>
  </div>
</template>
