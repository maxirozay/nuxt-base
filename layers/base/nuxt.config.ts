// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  routeRules: {
    '/signin': { ssr: false },
    '/user/**': { appMiddleware: 'authenticated', ssr: false },
    '/admin/**': { appMiddleware: 'admin', ssr: false },
  },
  runtimeConfig: {
    public: {
      url: 'http://localhost:3000',
      name: '',
      anonymousSignup: false,
    },
    autoSignup: false,
    db: '',
    smtp: {
      host: '',
      port: 465,
      user: '',
      pass: '',
      from: '',
    },
    filesPublicFolder: 'files/public',
    filesPrivateFolder: 'files/private',
    s3: {
      endpoint: '',
      region: 'us-east-1',
      publicBucket: 'files/public',
      privateBucket: 'files/private',
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
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/hints', '@nuxt/icon', 'nuxt-auth-utils', '@pinia/nuxt', 'nuxt-i18n-micro'],
})
