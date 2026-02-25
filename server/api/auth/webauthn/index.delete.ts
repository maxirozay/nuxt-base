import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { credentials } from '~~/server/database/schema'

const bodySchema = z.object({
  credentialId: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const { credentialId } = await readValidatedBody(event, bodySchema.parse)
  const session = await requireUserSession(event)
  await db
    .delete(credentials)
    .where(and(eq(credentials.id, credentialId), eq(credentials.userId, session.user.id)))
})
