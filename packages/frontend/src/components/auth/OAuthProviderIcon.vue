<script setup lang="ts">
import { computed } from 'vue'
import type { OAuthProvider } from '@/api'

const props = defineProps<{
  provider: OAuthProvider
}>()

const title = computed(() => `${props.provider} icon`)
</script>

<template>
  <svg
    v-if="provider === 'google'"
    class="oauth-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <title>{{ title }}</title>
    <path
      d="M21.35 11.1H12.18v2.98h5.27c-.5 2.32-2.48 3.97-5.27 3.97-3.2 0-5.8-2.65-5.8-5.92s2.6-5.92 5.8-5.92c1.44 0 2.74.55 3.76 1.45l2.2-2.2A8.92 8.92 0 0 0 12.18 3C7.22 3 3.2 7.06 3.2 12.08s4.02 9.08 8.98 9.08c5.18 0 8.6-3.64 8.6-8.77 0-.43-.04-.85-.12-1.29Z"
    />
  </svg>

  <svg
    v-else-if="provider === 'github'"
    class="oauth-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <title>{{ title }}</title>
    <path
      d="M12 .5C5.649.5.5 5.796.5 12.327c0 5.223 3.292 9.654 7.86 11.218.575.11.786-.254.786-.566 0-.28-.011-1.022-.017-2.006-3.197.714-3.872-1.585-3.872-1.585-.523-1.362-1.278-1.725-1.278-1.725-1.045-.733.079-.718.079-.718 1.156.084 1.764 1.219 1.764 1.219 1.028 1.808 2.697 1.286 3.354.983.104-.766.402-1.286.731-1.581-2.552-.299-5.236-1.31-5.236-5.83 0-1.288.447-2.34 1.18-3.164-.118-.3-.512-1.506.112-3.14 0 0 .964-.317 3.159 1.208a10.78 10.78 0 0 1 2.876-.398c.976.005 1.96.136 2.876.398 2.192-1.525 3.154-1.208 3.154-1.208.627 1.634.233 2.84.115 3.14.735.825 1.178 1.876 1.178 3.164 0 4.53-2.689 5.528-5.249 5.822.414.368.783 1.094.783 2.205 0 1.592-.015 2.877-.015 3.268 0 .315.207.682.793.565 4.563-1.567 7.85-5.996 7.85-11.216C23.5 5.796 18.351.5 12 .5Z"
    />
  </svg>

  <svg
    v-else-if="provider === 'gitlab'"
    class="oauth-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <title>{{ title }}</title>
    <path
      d="M22.47 9.82 22.15 8.8a1.4 1.4 0 0 0-.53-.72L17.2 4.84l-.88-2.72a.5.5 0 0 0-.95 0l-.88 2.72h-5l-.88-2.72a.5.5 0 0 0-.95 0l-.88 2.72-4.42 3.24a1.4 1.4 0 0 0-.53.72l-.32 1.02a11.39 11.39 0 0 0 4.14 12.74.52.52 0 0 0 .82-.53l-.4-2.86h14.9l-.4 2.86a.52.52 0 0 0 .82.53 11.39 11.39 0 0 0 4.14-12.74ZM9.44 16.9H6.96V9.95h2.48v6.95Zm7.6 0h-2.48v-3.67c0-.93-.39-1.4-1.18-1.4-.86 0-1.3.56-1.3 1.66v3.41H9.6V9.95h2.48v.94c.67-.8 1.5-1.2 2.52-1.2.9 0 1.63.25 2.18.76.58.53.86 1.27.86 2.21v4.24Z"
    />
  </svg>

  <svg
    v-else
    class="oauth-icon"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <title>{{ title }}</title>
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
    <path d="M9.5 9.5h5v5h-5z" fill="currentColor" />
  </svg>
</template>
