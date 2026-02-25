export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  return getAuth(session.user.email, true)
})
