// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      anonymousSignup: false,
      refreshToken: {
        rotateAfter: 60 * 60 * 24, // 1 day
      },
      oauth: {
        microsoft: false,
      },
    },
    session: {
      maxAge: 3600, // 1 hour
      password: '',
    },
    oauth: {
      microsoft: {
        clientId: '',
        clientSecret: '',
        tenant: 'common',
      },
    },
    refreshToken: {
      maxAge: 60 * 60 * 24 * 30, // 30 days
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
      publicBucket: '',
      privateBucket: '',
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
  i18n: {
    locales: [{ code: 'en' }, { code: 'fr' }],
    defaultLocale: 'en',
    translationDir: 'locales',
  },
  auth: {
    webAuthn: true,
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/hints', '@nuxt/icon', 'nuxt-auth-utils', '@pinia/nuxt', 'nuxt-i18n-micro'],
})
