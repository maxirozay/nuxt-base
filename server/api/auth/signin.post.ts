import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '~~/server/database/schema'

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(12),
})

interface User {
  id: string
  email: string
  password?: string | null,
  totp?: string | null
}

export default defineEventHandler(async (event) => {
  const { email, password } = await readValidatedBody(event, bodySchema.parse)

  const user = await getUser(email, password)
  
  if (user!.password && await verifyPassword(user!.password, password)) {
    if (user.totp) {
      throw createError({
        status: 401,
        message: 'TOTP required',
      })
    }
    return setSession(event, user!)
  }

  throw createError({
    status: 401,
    message: 'Bad credentials',
  })
})

async function createUser(user: any): Promise<User> {
  const insertedUsers = await db.insert(auth).values({
    email: user.email,
    password: await hashPassword(user.password)
  }).returning()
  if (!insertedUsers[0]) {
    throw createError({
      status: 500,
      message: 'User creation failed',
    })
  }
  return insertedUsers[0]
}

export async function getUser(email: string, password?: string): Promise<User> {
  let user = await db.select().from(auth).where(eq(auth.email, email))
    .then(result => result[0])
  if (user) return user
  return createUser({ email, password })
}

export function setSession(event: any, user: User) {
  return setUserSession(event, {
    user: {
      id: user!.id,
      email: user!.email,
    },
  })
}