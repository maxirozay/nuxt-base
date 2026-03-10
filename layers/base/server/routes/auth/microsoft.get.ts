export default defineOAuthMicrosoftEventHandler({
  async onSuccess(event, { user }) {
    const auth = await getAuth(event, user.mail).catch((error) => {
      const config = useRuntimeConfig()

      if (error.statusCode === 404 && config.autoSignup) {
        return createAuth({ email: user.mail })
      }
      throw error
    })
    await setSession(event, auth)
    return sendRedirect(event, '/')
  },
})
