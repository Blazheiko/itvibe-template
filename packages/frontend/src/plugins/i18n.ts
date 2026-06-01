import { createI18n } from 'vue-i18n'
import en from '@/locales/en'
import { APP_LOCALE_CODES } from 'shared/enums'

export const SUPPORTED_LOCALES = APP_LOCALE_CODES
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
type LocaleSchema = typeof en
type LocaleMessageTree = Record<string, unknown>

function isLocaleMessageTree(value: unknown): value is LocaleMessageTree {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeLocaleMessages(fallback: LocaleMessageTree, locale: LocaleMessageTree): LocaleMessageTree {
  const merged: LocaleMessageTree = { ...fallback }

  Object.entries(locale).forEach(([key, value]) => {
    const fallbackValue = merged[key]
    if (isLocaleMessageTree(fallbackValue) && isLocaleMessageTree(value)) {
      merged[key] = mergeLocaleMessages(fallbackValue, value)
      return
    }
    merged[key] = value
  })

  return merged
}

const messages: Partial<Record<SupportedLocale, LocaleSchema>> = {
  en,
}

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages,
})

export async function loadLocale(locale: SupportedLocale): Promise<void> {
  if (locale === 'en') return

  const messages = await import(`@/locales/${locale}.ts`)
  i18n.global.setLocaleMessage(
    locale,
    mergeLocaleMessages(en as LocaleMessageTree, messages.default as LocaleMessageTree) as LocaleSchema,
  )
}
