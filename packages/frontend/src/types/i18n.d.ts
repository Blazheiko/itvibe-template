import type en from '@/locales/en'

type LocaleSchema = typeof en

declare module 'vue-i18n' {
  export interface DefineLocaleMessage extends LocaleSchema {}
}
