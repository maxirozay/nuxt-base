export default defineNuxtRouteMiddleware(() => {
  const { loggedIn } = useUserSession()
  console.log('app middleware')

  if (!loggedIn.value) {
    return navigateTo('/signin')
  }
})
