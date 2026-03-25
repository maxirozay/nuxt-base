export async function isAdmin(event: any) {
  const { user } = await requireUserSession(event)
  if (user.role === 'admin') return true

  throw createError({ statusCode: 403, message: 'Insufficient permissions' })
}

export async function getOrganizationMember(event: any, organizationId: string) {
  const { user } = await requireUserSession(event)
  const membership = await db.query.organizationMembers.findFirst({
    where: {
      userId: user.id,
      organizationId,
    },
  })
  if (!membership) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }

  return membership
}

export async function isOrganizationMember(event: any, organizationId: string) {
  if (await getOrganizationMember(event, organizationId)) return true
}

export async function isOrganizationAdmin(event: any, organizationId: string) {
  const membership = await getOrganizationMember(event, organizationId)
  if (membership?.role === 'admin') return true

  throw createError({ statusCode: 403, message: 'Insufficient permissions' })
}
