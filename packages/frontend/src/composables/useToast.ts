import { useToastStore } from '@/stores/toast'
import type { ToastType } from '@/stores/toast'

interface ShowOptions {
    message?: string
    duration?: number
    action?: { label: string; onClick: () => void }
}

export function useToast() {
    const store = useToastStore()

    function show(type: ToastType, title: string, options?: ShowOptions): string {
        const duration = options?.duration ?? 5000
        const id = store.add({
            type,
            title,
            message: options?.message,
            duration,
            action: options?.action,
        })
        if (duration > 0) {
            setTimeout(() => { store.remove(id) }, duration)
        }
        return id
    }

    return {
        info: (title: string, opts?: ShowOptions) => show('info', title, opts),
        success: (title: string, opts?: ShowOptions) => show('success', title, opts),
        warning: (title: string, opts?: ShowOptions) => show('warning', title, opts),
        error: (title: string, opts?: ShowOptions) => show('error', title, opts),
        dismiss: (id: string) => { store.remove(id) },
    }
}
