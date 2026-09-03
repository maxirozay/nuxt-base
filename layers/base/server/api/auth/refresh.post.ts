export default defineEventHandler(async (event) => {
  const { user, refreshToken } = await verifyRefreshToken(event)
  await revokeRefreshToken(refreshToken.token)
  await createRefreshToken(user.id, event)
})
