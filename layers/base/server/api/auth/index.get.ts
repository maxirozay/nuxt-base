export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  return getAuth(event, session.user.email, true)
})
