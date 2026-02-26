export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api') || event.path.startsWith('/api/auth')) return

  const session = await requireUserSession(event)
  const user = session.user
  if (!user) throw createError({ statusCode: 401, message: 'Unauthenticated' })

  event.context.user = user
})
