export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const user = await getAuth(event, session.user.email, true)
  return {
    credentials: user.credentials!.map(({ id, name }) => ({ id, name })),
    hasPassword: !!user.password,
    hasTOTP: !!user.totp,
    forceMfa: useRuntimeConfig().forceMfa,
  }
})
