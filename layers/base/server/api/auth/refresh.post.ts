export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const existingToken = getCookie(event, 'refresh_token')
  if (existingToken) {
    await revokeRefreshToken(existingToken)
  }
  await createRefreshToken(session.user.id, event)
})
