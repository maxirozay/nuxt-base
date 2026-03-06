export async function checkFileAccess(event: any, path: string) {
  const { user } = await getUserSession(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const root = `u/${user.id}`
  if (path.startsWith(root) && (path[root.length] === '/' || path.length === root.length)) {
    return true
  }

  if (path.startsWith('o/')) {
    const orgId = path.substring(2).replace(/\/.*/, '')
    const membership = await db.query.organizationMembers.findFirst({
      where: {
        userId: user.id,
        organizationId: orgId,
      },
    })
    if (membership?.role === 'admin') return true
  } else if (user.role === 'admin') return true

  throw createError({ statusCode: 403, message: 'Insufficient permissions' })
}
