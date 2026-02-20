import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '~~/server/database/schema'

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(12),
})

export default defineEventHandler(async (event) => {
  const { email, password } = await readValidatedBody(event, bodySchema.parse)

  const usersResult = await db.select().from(users).where(eq(users.email, email)).limit(1)
  let user = usersResult[0]
  if (!user) {
    const insertedUsers = await db.insert(users).values({
      email,
      password: await hashPassword(password)
    }).returning()
    user = insertedUsers[0]
  }
  
  if (user!.password && await verifyPassword(user!.password, password)) {
    await setUserSession(event, {
      user: {
        id: user!.id,
        email,
      },
    })
    return {}
  }

  throw createError({
    status: 401,
    message: 'Bad credentials',
  })
})
