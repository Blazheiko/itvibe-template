import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize API settings store to load settings from localStorage
// import { useApiSettingsStore } from '@/stores/api-settings'
// const apiSettingsStore = useApiSettingsStore(pinia)
// Settings are automatically loaded in the store constructor

app.mount('#app')
