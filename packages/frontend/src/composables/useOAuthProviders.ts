import { ref, type Ref } from 'vue'
import type { OAuthProvider } from 'shared/responses'
import { authApi } from '@/utils/api'

// Module-level: the list is loaded once per page and shared by every caller.
const providers = ref<OAuthProvider[]>([])
let loading: Promise<void> | null = null

const load = async (): Promise<void> => {
    try {
        const { data, error } = await authApi.getOAuthProviders()
        if (error === null && data !== null) {
            providers.value = data.providers
            return
        }
    } catch (err: unknown) {
        console.error('Failed to load OAuth providers:', err)
    }
    // No buttons is safer than buttons that lead to a provider error page;
    // allow a later caller to try again.
    loading = null
}

/** OAuth providers configured on the backend, in the order the backend lists them. */
export function useOAuthProviders(): { providers: Ref<OAuthProvider[]> } {
    loading ??= load()
    return { providers }
}

/** Test helper: forget the cached list. */
export function resetOAuthProviders(): void {
    providers.value = []
    loading = null
}
