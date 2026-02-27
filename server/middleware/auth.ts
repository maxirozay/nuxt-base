export default defineEventHandler(async (event) => {
  const [root, type] = event.path.substring(1, 10).split('/')
  if (root !== 'api' || type?.endsWith('auth')) return

  const session = await requireUserSession(event)
  const user = session.user
  if (!user) throw createError({ statusCode: 401, message: 'Unauthenticated' })

  event.context.user = user
})
