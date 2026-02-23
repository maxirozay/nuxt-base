import { z } from 'zod'
import { verify } from 'otplib'
import { eq } from 'drizzle-orm/sql/expressions/conditions'
import { auth } from '~~/server/database/schema'

const bodySchema = z.object({
  token: z.string().length(6),
})

export default defineEventHandler(async (event) => {
  const { token } = await readValidatedBody(event, bodySchema.parse)
  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields',
    })
  }
  const session = await requireUserSession(event)
  const user = await getUser(session.user.email)

  if (await verify({ secret: user.totp!, token })) {
    await db.update(auth).set({ totp: null }).where(eq(auth.id, session.user.id))
  } else throw createError({ statusCode: 400, message: 'Invalid TOTP.' })
})
