export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  await revokeAllUserTokens(session.user.id)
})
