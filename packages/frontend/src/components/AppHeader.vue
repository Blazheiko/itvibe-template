<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import MenuButton from '@/components/MenuButton.vue'
import { computed, ref, onMounted } from 'vue'
import { useEventBus } from '@/utils/event-bus'
import { useWebSocketConnection } from '@/composables/useWebSocketConnection'

// Props
defineProps({
    title: {
        type: String,
        default: '',
    },
    showBack: {
        type: Boolean,
        default: false,
    },
})

const router = useRouter()
const route = useRoute()
const eventBus = useEventBus()

const activeNav = computed(() => route.path)

// WebSocket connection status
const { statusWebSocket } = useWebSocketConnection()

// Computed properties for WebSocket status
const websocketStatusText = computed(() => {
    switch (statusWebSocket.value) {
        case 'OPEN':
            return 'Connected'
        case 'CONNECTING':
            return 'Connecting...'
        case 'CLOSED':
            return 'Disconnected'
        default:
            return 'Unknown'
    }
})

const websocketStatusClass = computed(() => {
    switch (statusWebSocket.value) {
        case 'OPEN':
            return 'status-connected'
        case 'CONNECTING':
            return 'status-connecting'
        case 'CLOSED':
            return 'status-disconnected'
        default:
            return 'status-unknown'
    }
})

// Состояние звуковых уведомлений (глобальная кнопка в шапке)
const notificationsEnabled = ref(true)
onMounted(() => {
    notificationsEnabled.value = localStorage.getItem('notifications_enabled') !== 'false'
})

const toggleNotifications = () => {
    notificationsEnabled.value = !notificationsEnabled.value
    localStorage.setItem('notifications_enabled', String(notificationsEnabled.value))
    eventBus.emit('toggle_notifications', { enabled: notificationsEnabled.value })
}

// Вернуться назад
const goBack = () => {
    router.back()
}
</script>

<template>
    <header class="app-header">
        <div class="header-content">
            <div class="left-side">
                <button v-if="showBack" class="back-button" @click="goBack">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="24"
                        height="24"
                        fill="currentColor"
                    >
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                    <span>Back</span>
                </button>
            </div>

            <div class="right-side">
                <nav class="main-nav">
                    <button
                        class="nav-item"
                        :class="{ active: activeNav === '/support' }"
                        @click="router.push('/support')"
                        title="Support"
                    >
                        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                            <path
                                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"
                                fill="currentColor"
                            />
                        </svg>
                        <span>Support</span>
                    </button>
                </nav>
                <button
                    class="notification-button"
                    @click="toggleNotifications"
                    title="Toggle notification sound"
                >
                    <svg
                        v-if="notificationsEnabled"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                    >
                        <path
                            d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"
                            fill="currentColor"
                        />
                    </svg>
                    <svg
                        v-else
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                    >
                        <path
                            d="M20 18.69L7.84 6.14 5.27 3.49 4 4.76l2.8 2.8v.01c-.52.99-.8 2.16-.8 3.42v5l-2 2v1h13.73l2 2L21 19.72l-1-1.03zM12 22c1.11 0 2-.89 2-2h-4c0 1.11.89 2 2 2zm6-7.32V11c0-3.08-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68c-.15.03-.29.08-.42.12-.1.03-.2.07-.3.11h-.01c-.01 0-.01 0-.02.01-.23.09-.46.2-.68.31 0 0-.01 0-.01.01l2.97 2.97V5.36c0-.22.02-.42.05-.62.07.41.23.78.46 1.06.43.52 1.1.84 1.83.84.33 0 .65-.06.93-.18.5.52.86 1.15 1.09 1.86.11.34.17.69.2 1.06v5.59l3.24 3.24-.07-.03c.45-.4.87-.92 1.22-1.5.19-.32.34-.67.45-1.05z"
                            fill="currentColor"
                        />
                    </svg>
                </button>

                <!-- WebSocket Status Indicator -->
                <div
                    class="websocket-status"
                    :class="websocketStatusClass"
                    :title="`WebSocket Status: ${websocketStatusText}`"
                >
                    <div class="status-dot"></div>
                    <span class="status-text">{{ websocketStatusText }}</span>
                </div>

                <MenuButton />
            </div>
        </div>
    </header>
</template>

<style scoped>
.app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--app-header-bg, #2146bfff);
    color: white;
    box-shadow: var(--box-shadow);
    width: 100%;
    padding: 0;
    height: var(--header-height);
    z-index: 300;
    position: relative;
}

.nav-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--danger-color);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
}

.dark-theme .app-header {
    background-color: var(--app-header-dark-bg, rgba(15, 23, 42, 0.85));
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--glass-border);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

.header-content {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.left-side,
.right-side {
    flex: 1;
    display: flex;
    align-items: center;
}

.left-side {
    justify-content: flex-start;
}

.right-side {
    justify-content: flex-end;
}

.main-nav {
    display: flex;
    gap: 2px;
    margin-right: 12px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 2px;
}

.nav-item {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.8);
    padding: 3px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: calc(11px * var(--app-font-scale, 1));
    font-weight: 500;
    line-height: 1.2;
    height: 20px;
    min-width: 52px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    transition: all 0.2s ease;
    white-space: nowrap;
}

.nav-item svg {
    flex-shrink: 0;
    opacity: 0.85;
}

.nav-item:hover {
    background-color: rgba(255, 255, 255, 0.15);
    color: white;
}

.nav-item.active {
    background: white;
    color: var(--primary-color);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.nav-item.active svg {
    opacity: 1;
}

.dark-theme .nav-item.active {
    background: rgba(255, 255, 255, 0.25);
    color: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.app-header h1 {
    margin: 0;
    font-weight: 600;
    font-size: calc(24px * var(--app-font-scale, 1));
}

.title-slot {
    flex: 1;
    text-align: center;
}

.back-button {
    padding: 8px 14px 8px 12px;
    background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.08)),
        rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.38);
    color: white;
    border-radius: 12px;
    cursor: pointer;
    transition:
        transform 0.18s ease,
        box-shadow 0.18s ease,
        border-color 0.18s ease,
        background-color 0.18s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: calc(14px * var(--app-font-scale, 1));
    font-weight: 600;
    letter-spacing: 0.01em;
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.22),
        0 4px 12px rgba(11, 25, 51, 0.18);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
}

.back-button:hover {
    background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.33), rgba(255, 255, 255, 0.12)),
        rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.72);
    transform: translateY(-1px) scale(1.01);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.3),
        0 8px 18px rgba(11, 25, 51, 0.24);
}

.back-button:active {
    transform: translateY(0);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.2),
        0 4px 10px rgba(11, 25, 51, 0.2);
}

.back-button:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.92);
    outline-offset: 2px;
}

.back-button svg {
    width: 18px;
    height: 18px;
    opacity: 0.96;
    transition: transform 0.18s ease;
}

.back-button:hover svg {
    transform: translateX(-1px);
}

.dark-theme .back-button {
    background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(148, 163, 184, 0.06)),
        rgba(15, 23, 42, 0.16);
    border-color: rgba(226, 232, 240, 0.42);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.14),
        0 6px 14px rgba(2, 6, 23, 0.36);
}

.dark-theme .back-button:hover {
    border-color: rgba(248, 250, 252, 0.72);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.2),
        0 8px 20px rgba(2, 6, 23, 0.42);
}

.notification-button {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    padding: 3px 6px;
    height: 22px;
    width: 22px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-right: 8px;
}

.notification-button:hover {
    background-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
}

/* WebSocket Status Indicator */
.websocket-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border-radius: 12px;
    font-size: calc(11px * var(--app-font-scale, 1));
    font-weight: 500;
    margin-right: 8px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.2s ease;
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    transition: all 0.2s ease;
}

.status-text {
    color: white;
    font-size: calc(10px * var(--app-font-scale, 1));
    line-height: 1;
}

/* Status Colors */
.status-connected .status-dot {
    background-color: #4ade80; /* green-400 */
    box-shadow: 0 0 6px rgba(74, 222, 128, 0.6);
}

.status-connecting .status-dot {
    background-color: #fbbf24; /* amber-400 */
    box-shadow: 0 0 6px rgba(251, 191, 36, 0.6);
    animation: pulse 2s infinite;
}

.status-disconnected .status-dot {
    background-color: #f87171; /* red-400 */
    box-shadow: 0 0 6px rgba(248, 113, 113, 0.6);
}

.status-unknown .status-dot {
    background-color: #9ca3af; /* gray-400 */
}

@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

@media (max-width: 768px) {
    .app-header {
        padding: 0;
    }

    .header-content {
        padding: 0 12px;
    }

    .right-side {
        gap: 8px;
        padding-right: 4px;
    }

    /* На мобильных основную навигацию не показываем */
    .main-nav {
        display: none;
    }

    .notification-button {
        width: 44px;
        height: 44px;
        padding: 10px;
        margin-right: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    /* WebSocket status на мобильных - показываем только точку */
    .websocket-status {
        padding: 4px;
        margin-right: 8px;
    }

    .websocket-status .status-text {
        display: none;
    }

    .websocket-status .status-dot {
        width: 10px;
        height: 10px;
    }

    .app-header h1 {
        font-size: calc(18px * var(--app-font-scale, 1));
    }

    .back-button {
        padding: 10px 12px;
        font-size: calc(14px * var(--app-font-scale, 1));
        min-height: 44px;
        min-width: 44px;
        justify-content: center;
        border-radius: 12px;
    }

    .back-button span {
        display: none;
    }
}
</style>
