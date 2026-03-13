export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  if (!loggedIn.value) {
    const redirectUrl = '/signin' + (to.fullPath !== '/' ? '?goto=' + to.fullPath : '')
    return navigateTo(redirectUrl, { replace: true })
  }
})
