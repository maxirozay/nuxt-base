// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  routeRules: {
    '/signin': { ssr: false },
    '/user/**': { appMiddleware: 'authenticated', ssr: false },
    '/admin/**': { appMiddleware: 'admin', ssr: false },
  },
  i18n: {
    locales: [{ code: 'en' }, { code: 'fr' }],
    defaultLocale: 'en',
    translationDir: 'locales',
  },
  css: ['~/assets/css/index.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: ['./layers/base'],
})
