export default defineOAuthMicrosoftEventHandler({
  async onSuccess(event, { user }) {
    if (!user.mail) {
      throw createError({
        status: 401,
        message: 'This Microsoft account has no email address',
      })
    }

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
