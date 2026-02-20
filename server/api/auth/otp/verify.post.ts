import { eq } from 'drizzle-orm'
import { users } from '~~/server/database/schema'
import { z } from 'zod'
import { OTP } from './get.post'

const bodySchema = z.object({
  email: z.email(),
  otp: z.string().length(6).or(z.string().min(32)),
})

export default defineEventHandler(async (event) => {
  const { email, otp } = await readValidatedBody(event, bodySchema.parse)
  if (!email || !otp) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and OTP are required'
    })
  }

  const storage = useStorage('otp')
  const record = await storage.getItem<OTP>(email)
  if (!record) {
    throw createError({ statusCode: 400, message: "Request a new OTP." })
  }
  if (Date.now() > record.sentAt! + 5 * 60 * 1000 || record.attempts > 3) {
    await storage.removeItem(email)
    throw createError({ statusCode: 400, message: "Request a new OTP." })
  }

  if (await verifyPassword(otp.length > 6 ? record.token : record.otp, otp)) {
    await storage.removeItem(email)
    const user = (await db.select().from(users).where(eq(users.email, email)))[0]

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    await setUserSession(event, {
      user: {
        id: user.id!,
        email: user.email
      }
    })

    return { success: true }
  }

  record.attempts++
  await storage.setItem(email, record)
  throw createError({ statusCode: 400, message: "Invalid OTP." })
})
