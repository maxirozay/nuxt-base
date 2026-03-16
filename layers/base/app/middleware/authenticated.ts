export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  if (!loggedIn.value) {
    if (String(to.name)?.endsWith('signin')) return
    const redirectUrl = '/signin' + (to.fullPath !== '/' ? '?goto=' + to.fullPath : '')
    return navigateTo(redirectUrl, { replace: true })
  }
})
