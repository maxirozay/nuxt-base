export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const user = await getAuth(event, undefined, true)
  return {
    credentials: user.credentials!.map(({ id, name }) => ({ id, name })),
    hasPassword: !!user.password,
    hasTOTP: !!user.totp,
    forceMfa: useRuntimeConfig().forceMfa,
  }
})
