export default defineEventHandler(async (event) => {
  const [root, type] = event.path.substring(1, 10).split('/')
  if (root !== 'api' || type?.endsWith('auth')) return

  const session = await requireUserSession(event)
  const user = session.user
  if (!user) throw createError({ statusCode: 401, message: 'Unauthenticated' })
  if (type === 'admin' && user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
  event.context.user = user
  if (event.node.req.method !== 'GET' && type !== 'log') logEvent(event)
})
