import { eq } from 'drizzle-orm'
import { auth } from '~~/server/database/schema'

export interface User {
  id: string
  email: string
  password?: string | null,
  totp?: string | null,
}

export async function createUser(user: any): Promise<User> {
  const insertedUsers = await db.insert(auth).values({
    email: user.email,
  }).returning()
  if (!insertedUsers[0]) {
    throw createError({
      status: 500,
      message: 'User creation failed',
    })
  }
  return insertedUsers[0]
}

export async function getUser(email: string): Promise<User> {
  let user = await db.select().from(auth).where(eq(auth.email, email))
    .then(result => result[0])
  if (!user) {
    throw createError({
      status: 404,
      message: 'User not found',
    })
  }
  return user
}

export function setSession(event: any, user: User) {
  return setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
    },
  })
}