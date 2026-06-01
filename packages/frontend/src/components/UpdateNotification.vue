<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const emit = defineEmits<{
    (e: 'refresh'): void
    (e: 'dismiss'): void
}>()
</script>

<template>
    <div class="update-notification">
        <div class="content">
            <div class="title">🚀 {{ t('update.title') }}</div>
            <div class="message">{{ t('update.subtitle') }}</div>
        </div>
        <div class="actions">
            <button class="btn-secondary" @click="emit('dismiss')">{{ t('update.later') }}</button>
            <button class="btn-primary" @click="emit('refresh')">{{ t('update.refresh') }}</button>
        </div>
    </div>
</template>

<style scoped>
.update-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--glass-bg);
    color: var(--text-color);
    padding: 16px 20px;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 10000;
    max-width: 320px;
    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
    gap: 12px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
}

.title {
    font-weight: 600;
    font-size: calc(15px * var(--app-font-scale, 1));
}

.message {
    opacity: 0.8;
    font-size: calc(13px * var(--app-font-scale, 1));
    margin-top: 4px;
}

.actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.btn-primary, .btn-secondary {
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    font-weight: 500;
    font-size: calc(13px * var(--app-font-scale, 1));
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-primary {
    background: var(--primary-color);
    color: white;
    border: none;
}

.btn-primary:hover {
    background: var(--accent-hover);
}

.btn-secondary {
    background: transparent;
    color: var(--text-color);
    border: 1px solid var(--border-color);
}

.btn-secondary:hover {
    background: var(--accent-light);
}

@keyframes slideIn {
    from {
        transform: translateX(120%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
</style>
