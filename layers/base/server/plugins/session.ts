export default defineNitroPlugin(() => {
  sessionHooks.hook('clear', async (session, event) => {
    const refreshToken = getCookie(event, 'refresh_token')
    if (refreshToken) {
      deleteCookie(event, 'refresh_token')
      await revokeRefreshToken(refreshToken)
    }
  })
})
