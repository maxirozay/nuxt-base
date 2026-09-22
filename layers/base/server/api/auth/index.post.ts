import { eq } from 'drizzle-orm/sql/expressions/conditions'
import { z } from 'zod'
import { auth } from '#server/database/schema'

export default defineEventHandler(async (event) => {
  const { password } = await readValidatedBody(
    event,
    z.object({
      password: passwordSchema(),
    }).parse,
  )
  const session = await requireRecentAuth(event)
  await db
    .update(auth)
    .set({
      password: await hashPassword(password),
    })
    .where(eq(auth.id, session.user.id))
})
