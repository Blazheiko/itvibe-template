import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useApiStore } from './api-doc'

export const useApiTestingStore = defineStore('api-testing', () => {
  const apiStore = useApiStore()

  const isModalOpen = ref(false)
  const testingRouteId = ref<number | null>(null)

  const testingRoute = computed(() => {
    if (testingRouteId.value === null) {
      return null
    }

    return apiStore.findRouteById(testingRouteId.value)
  })

  const openTestingModal = (routeId: number) => {
    apiStore.setSelectedRoute(routeId)
    apiStore.setActiveRoute(routeId)
    testingRouteId.value = routeId
    isModalOpen.value = true
  }

  const closeTestingModal = () => {
    isModalOpen.value = false
    testingRouteId.value = null
  }

  const isRouteUnderTest = (routeId: number) => testingRouteId.value === routeId && isModalOpen.value

  return {
    isModalOpen,
    testingRouteId,
    testingRoute,
    openTestingModal,
    closeTestingModal,
    isRouteUnderTest,
  }
})
