import { auth } from '~~/server/database/schema'

export async function createAuth(user: any) {
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

export async function getAuth(email: string, credentials = false) {
  const user = await db.query.auth.findFirst({
    where: {
      email,
    },
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
    },
  })
}
