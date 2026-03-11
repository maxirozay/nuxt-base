export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.errorHandler = (err, instance, info) => {
    const componentName = instance?.$options?.__name || ''
    $fetch('/api/log', {
      method: 'POST',
      body: {
        summary: (err as Error).message + ' ' + info,
        data: err,
        origin: useRoute().fullPath + ' ' + componentName,
        type: 'error',
      },
    })
  }
})
