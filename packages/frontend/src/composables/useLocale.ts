import { useI18n } from 'vue-i18n'
import { i18n, loadLocale, SUPPORTED_LOCALES } from '@/plugins/i18n'
import type { SupportedLocale } from '@/plugins/i18n'
import { resolveLanguageCode } from 'shared/enums'

function isSupportedLocale(code: string): code is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(code)
}

export function useLocale() {
  const { locale } = useI18n({ useScope: 'global' })

  async function applyLocale(code: string): Promise<void> {
    const lang = isSupportedLocale(code) ? code : 'en'
    await loadLocale(lang)
    locale.value = lang
  }

  async function applyLocaleFromNativeLanguage(langNative?: string | null): Promise<void> {
    if (langNative === null || langNative === undefined || langNative === '') {
      if (locale.value !== 'en') {
        await applyLocale('en')
      }
      return
    }

    const resolved = resolveLanguageCode(langNative)
    if (locale.value !== resolved) {
      await applyLocale(resolved)
    }
  }

  async function initFromUser(langNative?: string | null): Promise<void> {
    await applyLocaleFromNativeLanguage(langNative)

    // initLocaleStandalone() already applied the browser-locale fallback
    // before the app mounted.
  }

  return { locale, applyLocaleFromNativeLanguage, initFromUser }
}

// Standalone initializer for use outside of components (e.g. before app mount)
export async function initLocaleStandalone(): Promise<void> {
  // One-time migration cleanup: legacy uiLang override no longer participates
  // in locale selection because the interface language now follows langNative.
  localStorage.removeItem('uiLang')
  const browserLang = resolveLanguageCode(navigator.language)
  const lang = isSupportedLocale(browserLang) ? browserLang : 'en'
  await loadLocale(lang)
  i18n.global.locale.value = lang
}
