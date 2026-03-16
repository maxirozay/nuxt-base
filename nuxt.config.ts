// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  routeRules: {
    '/signin': { ssr: false },
    '/user/**': { appMiddleware: 'authenticated', ssr: false },
    '/admin/**': { appMiddleware: 'admin', ssr: false },
  },
  app: {
    head: {
      htmlAttrs: {
        lang: 'en',
      },
      title: process.env.NUXT_PUBLIC_NAME,
      link: [],
      meta: [{ name: 'theme-color', content: '#000000' }],
    },
  },
  runtimeConfig: {
    public: {
      url: 'http://localhost:3000',
      name: 'Nuxt base',
      logo: 'https://placehold.co/200x100?text=logo',
    },
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
