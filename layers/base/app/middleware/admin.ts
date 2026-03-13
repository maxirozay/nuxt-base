export default defineNuxtRouteMiddleware((to) => {
  const { user } = useUserSession()

  if (user.value?.role !== 'admin') {
    const redirectUrl = '/signin' + (to.fullPath !== '/' ? '?goto=' + to.fullPath : '')
    return navigateTo(redirectUrl, { replace: true })
  }
})
