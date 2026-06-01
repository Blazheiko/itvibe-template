import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
    id: string
    type: ToastType
    title: string
    message?: string
    duration: number // ms; 0 = persistent
    action?: {
        label: string
        onClick: () => void
    }
}

export const useToastStore = defineStore('toast', () => {
    const toasts = ref<Toast[]>([])

    function add(toast: Omit<Toast, 'id'>): string {
        const id = crypto.randomUUID()
        toasts.value.push({ ...toast, id })
        return id
    }

    function remove(id: string): void {
        const idx = toasts.value.findIndex((t) => t.id === id)
        if (idx !== -1) toasts.value.splice(idx, 1)
    }

    return { toasts, add, remove }
})
