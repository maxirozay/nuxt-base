import { eq } from 'drizzle-orm'
import { users } from '~~/server/database/schema'
import { z } from 'zod'
import { generate } from 'otplib'

const bodySchema = z.object({
  email: z.email(),
  secret: z.string().min(32),
  code: z.string().length(6),
})

export default defineEventHandler(async (event) => {
  const { email, secret, code } = await readValidatedBody(event, bodySchema.parse)
  if (!email || !secret || !code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email, and code are required'
    })
  }

  const storage = useStorage()
  const secretHash = await storage.getItem<string>(email)
  if (!secretHash) {
    throw createError({ statusCode: 400, message: "Missing secret restart the process." });
  }

  const serverCode = await generate({ secret })
  if (await verifyPassword(secretHash, await hashPassword(secret)) && code === serverCode) {
    await storage.removeItem(email)
    await db.update(users).set({ totp: secret }).where(eq(users.email, email))

    return { success: true }
  }

  throw createError({ statusCode: 400, message: "Invalid code." });
})
