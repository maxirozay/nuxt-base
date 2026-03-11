export default defineNuxtRouteMiddleware((to) => {
  const { user } = useUserSession()

  if (user.value?.role !== 'admin') {
    return navigateTo('/signin?goto=' + to.fullPath, { replace: true })
  }
})
