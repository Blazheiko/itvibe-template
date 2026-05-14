import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const LEGACY_BASE_URL = ''
const FALLBACK_BASE_URL = ''
const BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || FALLBACK_BASE_URL

export interface ApiSettings {
  baseUrl: string
  pathPrefix: string
  globalHeaders: Record<string, string>
  enableGlobalHeaders: boolean
}

export const useApiSettingsStore = defineStore('api-settings', () => {
  const envBaseUrl = BASE_URL
  const persistedBaseUrl = ref<string>(BASE_URL)
  const baseUrlOverride = ref<string>('')
  const pathPrefix = ref<string>('')
  const globalHeaders = ref<Record<string, string>>({})
  const enableGlobalHeaders = ref<boolean>(true)

  const hasBaseUrlOverride = computed(() => Boolean(baseUrlOverride.value.trim()))
  const baseUrl = computed<string>(() => {
    const overrideUrl = baseUrlOverride.value.trim()
    return overrideUrl || persistedBaseUrl.value
  })

  const settings = computed<ApiSettings>(() => ({
    baseUrl: baseUrl.value,
    globalHeaders: enableGlobalHeaders.value ? globalHeaders.value : {},
    enableGlobalHeaders: enableGlobalHeaders.value,
    pathPrefix: pathPrefix.value,
  }))

  // Actions
  const setBaseUrl = (url: string) => {
    const normalizedUrl = url.trim()
    persistedBaseUrl.value = !normalizedUrl || normalizedUrl === LEGACY_BASE_URL
      ? BASE_URL
      : normalizedUrl
    saveToLocalStorage()
  }

  const setBaseUrlOverride = (url: string) => {
    baseUrlOverride.value = url.trim()
  }

  const clearBaseUrlOverride = () => {
    baseUrlOverride.value = ''
  }

  const setPathPrefix = (prefix: string) => {
    pathPrefix.value = prefix
    saveToLocalStorage()
  }

  const setGlobalHeaders = (headers: Record<string, string>) => {
    globalHeaders.value = headers
    saveToLocalStorage()
  }

  const addGlobalHeader = (key: string, value: string) => {
    globalHeaders.value[key] = value
    saveToLocalStorage()
  }

  const removeGlobalHeader = (key: string) => {
    delete globalHeaders.value[key]
    saveToLocalStorage()
  }

  const setEnableGlobalHeaders = (enabled: boolean) => {
    enableGlobalHeaders.value = enabled
    saveToLocalStorage()
  }

  const resetToDefaults = () => {
    persistedBaseUrl.value = BASE_URL
    baseUrlOverride.value = ''
    pathPrefix.value = ''
    globalHeaders.value = {}
    enableGlobalHeaders.value = true
    saveToLocalStorage()
  }

  // Save to localStorage
  const saveToLocalStorage = () => {
    try {
      const settingsData = {
        baseUrl: persistedBaseUrl.value,
        pathPrefix: pathPrefix.value,
        globalHeaders: globalHeaders.value,
        enableGlobalHeaders: enableGlobalHeaders.value,
      }
      localStorage.setItem('api-settings', JSON.stringify(settingsData))
      console.log('API settings saved to localStorage:', settingsData)
    } catch (error) {
      console.error('Error saving API settings to localStorage:', error)
    }
  }

  // Load from localStorage
  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('api-settings')
      if (saved) {
        const settingsData = JSON.parse(saved) as ApiSettings
        const savedBaseUrl = settingsData.baseUrl?.trim()
        persistedBaseUrl.value =
          !savedBaseUrl || savedBaseUrl === LEGACY_BASE_URL ? BASE_URL : savedBaseUrl
        pathPrefix.value = settingsData.pathPrefix || ''
        globalHeaders.value = settingsData.globalHeaders || {}
        enableGlobalHeaders.value =
          settingsData.enableGlobalHeaders !== undefined ? settingsData.enableGlobalHeaders : true
        console.log('API settings loaded from localStorage:', settingsData)
      } else {
        console.log('No API settings found in localStorage, using defaults')
      }
    } catch (error) {
      console.error('Error loading API settings from localStorage:', error)
      resetToDefaults()
    }
  }

  // Initialize settings on store creation
  loadFromLocalStorage()

  return {
    // State
    envBaseUrl,
    baseUrl,
    baseUrlOverride,
    hasBaseUrlOverride,
    pathPrefix,
    globalHeaders,
    enableGlobalHeaders,
    settings,

    // Actions
    setBaseUrl,
    setBaseUrlOverride,
    clearBaseUrlOverride,
    setPathPrefix,
    setGlobalHeaders,
    addGlobalHeader,
    removeGlobalHeader,
    setEnableGlobalHeaders,
    resetToDefaults,
    loadFromLocalStorage,
  }
})
