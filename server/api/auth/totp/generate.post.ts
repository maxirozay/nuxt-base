import { z } from 'zod'
import { generateSecret } from 'otplib'

const bodySchema = z.object({
  email: z.email(),
})

export default defineEventHandler(async (event) => {
  const { email } = await readValidatedBody(event, bodySchema.parse)
  if (!email || typeof email !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email is required'
    })
  }

  const secret = generateSecret()
  await useStorage().setItem(email, await hashPassword(secret))
  return { secret }
})
