export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()

  if (!loggedIn.value || !user.value?.requiresMfaSetup) return
  if (to.path.endsWith('/user/auth')) return

  return navigateTo('/user/auth', { replace: true })
})
