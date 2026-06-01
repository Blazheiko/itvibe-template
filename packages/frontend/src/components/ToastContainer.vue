<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

const store = useToastStore()

const iconMap: Record<string, string> = {
    info: 'ℹ',
    success: '✓',
    warning: '⚠',
    error: '✕',
}

const roleMap: Record<string, string> = {
    info: 'status',
    success: 'status',
    warning: 'alert',
    error: 'alert',
}
</script>

<template>
    <div class="toast-container" aria-live="polite" aria-atomic="false">
        <TransitionGroup name="toast" tag="div" class="toast-list">
            <div
                v-for="toast in store.toasts"
                :key="toast.id"
                :class="['toast', `toast--${toast.type}`]"
                :role="roleMap[toast.type]"
            >
                <span class="toast__icon" aria-hidden="true">{{ iconMap[toast.type] }}</span>
                <div class="toast__body">
                    <div class="toast__title">{{ toast.title }}</div>
                    <div v-if="toast.message" class="toast__message">{{ toast.message }}</div>
                </div>
                <button
                    v-if="toast.action"
                    class="toast__action-btn"
                    @click="toast.action.onClick()"
                >
                    {{ toast.action.label }}
                </button>
                <button
                    class="toast__dismiss-btn"
                    :aria-label="`Dismiss: ${toast.title}`"
                    @click="store.remove(toast.id)"
                >
                    ✕
                </button>
            </div>
        </TransitionGroup>
    </div>
</template>

<style scoped>
.toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    pointer-events: none;
    max-width: 340px;
    width: 100%;
}

.toast-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.toast {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 16px;
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-lg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    pointer-events: all;
    font-size: calc(13px * var(--app-font-scale, 1));
    transition: opacity 0.15s ease;
    word-break: break-word;
}

.toast--success { border-left: 3px solid var(--success-color); }
.toast--error   { border-left: 3px solid var(--danger-color); }
.toast--warning { border-left: 3px solid var(--warning-color); }
.toast--info    { border-left: 3px solid var(--info-color); }

.toast__icon {
    font-size: 14px;
    margin-top: 1px;
    flex-shrink: 0;
}

.toast__body {
    flex: 1;
    min-width: 0;
}

.toast__title {
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.3;
}

.toast__message {
    margin-top: 2px;
    color: var(--text-secondary);
    font-size: calc(12px * var(--app-font-scale, 1));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.toast__action-btn {
    margin-left: 8px;
    padding: 3px 10px;
    border-radius: var(--radius-sm);
    background: var(--primary-color);
    color: white;
    border: none;
    font-size: calc(12px * var(--app-font-scale, 1));
    font-weight: 500;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s ease;
}

.toast__action-btn:hover {
    background: var(--accent-hover);
}

.toast__dismiss-btn {
    margin-left: auto;
    padding: 2px 6px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: calc(12px * var(--app-font-scale, 1));
    cursor: pointer;
    flex-shrink: 0;
    border-radius: var(--radius-sm);
    line-height: 1;
    transition: color 0.15s ease;
}

.toast__dismiss-btn:hover {
    color: var(--text-primary);
}

/* Animations */
.toast-enter-active {
    animation: toast-slide-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-leave-active {
    animation: toast-slide-out 0.22s ease forwards;
    pointer-events: none;
}
.toast-move {
    transition: transform 0.22s ease;
}

@keyframes toast-slide-in {
    from { transform: translateX(110%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
}

@keyframes toast-slide-out {
    from { transform: translateX(0);    opacity: 1; }
    to   { transform: translateX(110%); opacity: 0; }
}

@media (max-width: 480px) {
    .toast-container {
        top: 12px;
        right: 12px;
        left: 12px;
        max-width: none;
    }
}
</style>
