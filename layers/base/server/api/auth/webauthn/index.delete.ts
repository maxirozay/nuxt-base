import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth, credentials } from '#server/database/schema'

const bodySchema = z.object({
  credentialId: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const { credentialId } = await readValidatedBody(event, bodySchema.parse)
  const session = await requireRecentAuth(event)
  const userId = session.user.id

  if (!useRuntimeConfig().forceMfa) {
    await db
      .delete(credentials)
      .where(and(eq(credentials.id, credentialId), eq(credentials.userId, userId)))
    return
  }

  await db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ totp: auth.totp })
      .from(auth)
      .where(eq(auth.id, userId))
      .for('update')
    if (!locked) {
      throw createError({ status: 404, message: 'User not found' })
    }

    const remaining = await tx
      .select({ id: credentials.id })
      .from(credentials)
      .where(eq(credentials.userId, userId))
    if (!locked.totp && remaining.length <= 1) {
      throw createError({ status: 400, message: 'Keep at least one second factor.' })
    }

    await tx
      .delete(credentials)
      .where(and(eq(credentials.id, credentialId), eq(credentials.userId, userId)))
  })
})
