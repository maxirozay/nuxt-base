import { auth } from '#server/database/schema'
import { eq } from 'drizzle-orm'

export async function createAuthUser(user: any) {
  const insertedUsers = await db
    .insert(auth)
    .values({
      email: user.email,
    })
    .returning()
  if (!insertedUsers[0]) {
    throw createError({
      status: 500,
      message: 'User creation failed',
    })
  }
  return insertedUsers[0]
}

export async function setAuthUser(user: any) {
  const insertedUsers = await db
    .update(auth)
    .set({
      email: user.email,
    })
    .where(eq(auth.id, user.id))
    .returning()
  if (!insertedUsers[0]) {
    throw createError({
      status: 500,
      message: 'User update failed',
    })
  }
  return insertedUsers[0]
}

export async function getAuth(event: any, email?: string, credentials = false) {
  let where: any = { email }
  if (!email) {
    const session = await getUserSession(event)
    where = { id: session?.user?.id }
  }
  const user = await db.query.auth.findFirst({
    where,
    with: {
      credentials,
    },
  })
  if (!user) {
    throw createError({
      status: 404,
      message: 'User not found',
    })
  }
  return user
}

export function setSession(event: any, user: any) {
  return setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      isAnonymous: !user.email,
    },
  })
}
