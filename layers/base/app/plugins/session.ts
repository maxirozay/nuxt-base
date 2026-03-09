export default defineNuxtPlugin(() => {
  if (import.meta.server) return
  const { session } = useUserSession()
  const lastRefreshed = parseInt(localStorage.getItem('rotate-token-at') || '0')
  const refreshAfter = lastRefreshed + useRuntimeConfig().public.refreshToken.rotateAfter * 1000

  if (session.value && session.value.expiresAt > Date.now() && refreshAfter < Date.now()) {
    $fetch('/api/auth/refresh', { method: 'POST' })
      .then(() => {
        localStorage.setItem('rotate-token-at', Date.now().toString())
      })
      .catch()
  }
})
