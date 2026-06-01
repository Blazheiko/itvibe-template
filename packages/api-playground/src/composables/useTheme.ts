import { ref, onMounted, watch } from 'vue'

export function useTheme() {
  const isDark = ref(false)

  const applyTheme = (theme: 'light' | 'dark') => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      isDark.value = true
    } else {
      document.documentElement.classList.remove('dark')
      isDark.value = false
    }
  }

  const toggleTheme = () => {
    const newTheme = isDark.value ? 'light' : 'dark'
    applyTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  const initializeTheme = () => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    const theme = savedTheme || 'light'
    applyTheme(theme)
  }

  onMounted(() => {
    initializeTheme()
  })

  watch(isDark, (newValue) => {
    localStorage.setItem('theme', newValue ? 'dark' : 'light')
  })

  return {
    isDark,
    toggleTheme,
    initializeTheme,
  }
}

