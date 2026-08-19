export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()

  if (!loggedIn.value) {
    if (String(to.name)?.endsWith('signin')) return
    const redirectUrl =
      '/signin' + (to.fullPath !== '/' ? '?goto=' + encodeURIComponent(to.fullPath) : '')
    return navigateTo(redirectUrl, { replace: true })
  }

  if (user.value?.requiresMfaSetup && to.path !== '/user/auth') {
    return navigateTo('/user/auth', { replace: true })
  }
})
