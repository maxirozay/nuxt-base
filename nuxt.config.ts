// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      url: 'http://localhost:3000',
    },
    db: '',
    smtp: {
      host: '',
      port: 587,
      user: '',
      pass: '',
      from: ''
    },
    s3: {
      endpoint: '',
      region: 'us-east-1',
      bucket: '',
      accessKeyId: '',
      secretAccessKey: '',
      publicUrl: ''
    }
  },
  nitro: {
    storage: {
      otp: {
        driver: 'memory'
      }
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/hints', '@nuxt/icon', 'nuxt-auth-utils']
})