import { eq } from 'drizzle-orm/sql/expressions/conditions'
import { auth, credentials } from '#server/database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireRecentAuth(event)
  const userId = session.user.id

  await db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ totp: auth.totp })
      .from(auth)
      .where(eq(auth.id, userId))
      .for('update')
    if (!locked) {
      throw createError({ status: 404, message: 'User not found' })
    }
    if (!locked.totp) {
      throw createError({ status: 400, message: 'TOTP is not enabled.' })
    }

    if (useRuntimeConfig().forceMfa) {
      const remaining = await tx
        .select({ id: credentials.id })
        .from(credentials)
        .where(eq(credentials.userId, userId))
      if (!remaining.length) {
        throw createError({ status: 400, message: 'Keep at least one second factor.' })
      }
    }

    await tx.update(auth).set({ totp: null }).where(eq(auth.id, userId))
  })
})
