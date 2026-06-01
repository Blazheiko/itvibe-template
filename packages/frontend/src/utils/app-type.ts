export type AppType = 'web' | 'pwa'

export function isPwaMode(): boolean {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone =
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    const isMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches

    return isStandalone || isIOSStandalone || isMinimalUi
}

export function getCurrentAppType(): AppType {
    return isPwaMode() ? 'pwa' : 'web'
}
