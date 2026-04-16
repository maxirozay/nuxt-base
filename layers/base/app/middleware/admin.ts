export default defineNuxtRouteMiddleware((to) => {
  const { user } = useUserSession()

  if (!user.value) {
    const redirectUrl = '/signin' + (to.fullPath !== '/' ? '?goto=' + to.fullPath : '')
    return navigateTo(redirectUrl, { replace: true })
  } else if (user.value.role !== 'admin') {
    return createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'You do not have permission to access this page.',
    })
  }
})
