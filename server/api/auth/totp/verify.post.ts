import { z } from 'zod'
import { verify } from 'otplib'
import { verifyOTP } from '../otp/verify.post'

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(12).optional(),
  otp: z.string().length(6).or(z.string().min(32)).optional(),
  token: z.string().length(6),
})

export default defineEventHandler(async (event) => {
  const { email, password, otp, token } = await readValidatedBody(event, bodySchema.parse)
  if (!email || !(otp || password) || !token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields',
    })
  }

  const user = await getUser(email)

  if (otp) await verifyOTP(email, otp)
  else if (password) await verifyPassword(user.password!, password)

  if (await verify({ secret: user.totp!, token })) {
    await setSession(event, user)
  } else throw createError({ statusCode: 400, message: 'Invalid TOTP.' })
})
