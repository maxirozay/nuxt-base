import type { FetchError } from 'ofetch'

export default defineNuxtPlugin(async () => {
  if (import.meta.server) return
  const { session, clear } = useUserSession()
  if (!session.value?.user) return

  const lastRefreshed = parseInt(localStorage.getItem('rotate-token-at') || '0')
  if (lastRefreshed) {
    const refreshAfter = lastRefreshed + useRuntimeConfig().public.refreshToken.rotateAfter * 1000
    if (session.value.expiresAt < Date.now() || refreshAfter > Date.now()) return
    try {
      await $fetch('/api/auth/refresh', { method: 'POST' })
    } catch (error) {
      if ((error as FetchError).response?.status !== 401) return
      await clear()
      return
    }
  }
  localStorage.setItem('rotate-token-at', Date.now().toString())
})
