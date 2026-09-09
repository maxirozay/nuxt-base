import type { NuxtError } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  const requestFetch = useRequestFetch()

  nuxtApp.vueApp.config.errorHandler = (err, instance, info) => {
    const status = (err as NuxtError).status
    if (status && status >= 400 && status < 500) return

    const componentName = instance?.$options?.__name || ''
    requestFetch('/api/log', {
      method: 'POST',
      body: {
        summary: (err as Error).message + ' ' + info,
        data: err,
        origin: useRoute().fullPath + ' ' + componentName,
        type: 'error',
      },
    }).catch(() => {})
  }
})
