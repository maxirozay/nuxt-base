// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  routeRules: {
    '/signin': { ssr: false },
    '/api/**': { cors: true },
  },
  runtimeConfig: {
    public: {
      url: 'http://localhost:3000',
      name: '',
    },
    db: '',
    smtp: {
      host: '',
      port: 587,
      user: '',
      pass: '',
      from: '',
    },
    s3: {
      endpoint: '',
      region: 'us-east-1',
      bucket: '',
      accessKeyId: '',
      secretAccessKey: '',
      publicUrl: '',
    },
  },
  nitro: {
    storage: {
      auth: {
        driver: 'memory',
      },
    },
  },
  auth: {
    webAuthn: true,
  },
  css: ['~/assets/css/index.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/hints', '@nuxt/icon', 'nuxt-auth-utils', '@pinia/nuxt'],
})
