import { eq } from 'drizzle-orm/sql/expressions/conditions'
import { z } from 'zod'
import { auth } from '~~/server/database/schema'

const bodySchema = z.object({
  password: z.string().min(12),
})

export default defineEventHandler(async (event) => {
  const { password } = await readValidatedBody(event, bodySchema.parse)
  const session = await requireUserSession(event)
  await db.update(auth).set({
    password: await hashPassword(password),
  }).where(eq(auth.id, session.user.id))
})
