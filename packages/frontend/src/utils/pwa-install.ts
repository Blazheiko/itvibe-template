import { readonly, ref } from 'vue'

export interface BeforeInstallPromptEvent extends Event {
    readonly platforms: readonly string[]
    prompt(): Promise<void>
    readonly userChoice: Promise<{
        readonly outcome: 'accepted' | 'dismissed'
        readonly platform: string
    }>
}

interface RelatedApp {
    readonly id?: string
    readonly platform?: string
    readonly url?: string
}

interface NavigatorWithInstalledRelatedApps extends Navigator {
    getInstalledRelatedApps?: () => Promise<RelatedApp[]>
}

const isInstallAvailable = ref(false)
const deferredPromptEvent = ref<BeforeInstallPromptEvent | null>(null)
const hasInstalledRelatedApp = ref(false)

let isInitialized = false
let pendingInstalledRelatedAppRefresh: Promise<boolean> | null = null

function getAppOrigin(): string {
    return window.location.origin
}

function getAppManifestUrl(): string {
    return new URL('/manifest.json', getAppOrigin()).href
}

function getAppId(): string {
    return new URL('/', getAppOrigin()).href
}

function normalizeRelatedAppUrl(url: string | undefined): string | null {
    if (!url) {
        return null
    }

    try {
        return new URL(url, getAppOrigin()).href
    } catch {
        return null
    }
}

async function doRefreshInstalledRelatedAppState(): Promise<boolean> {
    if (typeof window === 'undefined') {
        hasInstalledRelatedApp.value = false
        return false
    }

    const navigatorWithInstalledRelatedApps = navigator as NavigatorWithInstalledRelatedApps
    if (typeof navigatorWithInstalledRelatedApps.getInstalledRelatedApps !== 'function') {
        hasInstalledRelatedApp.value = false
        return false
    }

    try {
        const relatedApps = await navigatorWithInstalledRelatedApps.getInstalledRelatedApps()
        const appManifestUrl = getAppManifestUrl()
        const appId = getAppId()
        hasInstalledRelatedApp.value = relatedApps.some(
            (app) =>
                app.platform === 'webapp' &&
                (normalizeRelatedAppUrl(app.id) === appId ||
                    normalizeRelatedAppUrl(app.url) === appManifestUrl),
        )
    } catch {
        hasInstalledRelatedApp.value = false
    }

    return hasInstalledRelatedApp.value
}

async function refreshInstalledRelatedAppState(): Promise<boolean> {
    if (pendingInstalledRelatedAppRefresh !== null) {
        return pendingInstalledRelatedAppRefresh
    }

    pendingInstalledRelatedAppRefresh = doRefreshInstalledRelatedAppState().finally(() => {
        pendingInstalledRelatedAppRefresh = null
    })

    return pendingInstalledRelatedAppRefresh
}

async function handleBeforeInstallPrompt(event: Event): Promise<void> {
    const promptEvent = event as BeforeInstallPromptEvent
    promptEvent.preventDefault()

    try {
        const isAlreadyInstalled = await refreshInstalledRelatedAppState()
        if (isAlreadyInstalled) {
            deferredPromptEvent.value = null
            isInstallAvailable.value = false
            return
        }

        deferredPromptEvent.value = promptEvent
        isInstallAvailable.value = true
    } catch {
        deferredPromptEvent.value = null
        isInstallAvailable.value = false
    }
}

function handleAppInstalled(): void {
    deferredPromptEvent.value = null
    isInstallAvailable.value = false
    hasInstalledRelatedApp.value = true
}

function handleWindowVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
        void refreshInstalledRelatedAppState()
    }
}

function handleWindowFocus(): void {
    void refreshInstalledRelatedAppState()
}

function handleWindowPageShow(): void {
    void refreshInstalledRelatedAppState()
}

export function initializePwaInstallTracking(): void {
    if (isInitialized || typeof window === 'undefined') {
        return
    }

    isInitialized = true
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
    window.removeEventListener('focus', handleWindowFocus)
    window.removeEventListener('pageshow', handleWindowPageShow)
    document.removeEventListener('visibilitychange', handleWindowVisibilityChange)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('pageshow', handleWindowPageShow)
    document.addEventListener('visibilitychange', handleWindowVisibilityChange)
    void refreshInstalledRelatedAppState()
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | null> {
    const promptEvent = deferredPromptEvent.value
    if (promptEvent === null) {
        return null
    }

    deferredPromptEvent.value = null
    isInstallAvailable.value = false

    try {
        await promptEvent.prompt()
        const choice = await promptEvent.userChoice
        return choice.outcome
    } catch {
        return null
    }
}

export function usePwaInstallState() {
    return {
        deferredPromptEvent: readonly(deferredPromptEvent),
        isInstallAvailable: readonly(isInstallAvailable),
        hasInstalledRelatedApp: readonly(hasInstalledRelatedApp),
    }
}
