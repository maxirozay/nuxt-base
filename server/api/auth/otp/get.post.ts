import { z } from 'zod'
import crypto from 'crypto'

const bodySchema = z.object({
  email: z.email(),
})

export interface OTP {
  otp: string
  token: string
  attempts: number
  sentAt: number
}

export default defineEventHandler(async (event) => {
  const { email } = await readValidatedBody(event, bodySchema.parse)
  if (!email || typeof email !== 'string') {
    throw createError({
      status: 400,
      message: 'Email is required',
    })
  }

  const storage = useStorage('auth')
  const record = await storage.getItem<OTP>(email)
  if (record && Date.now() < record.sentAt! + 60000) {
    throw createError({ status: 400, message: 'Wait a minute before requesting a new OTP.' })
  }

  const otp = generateOTP()
  const token = crypto.randomBytes(32).toString('base64url')
  await storage.setItem(email, {
    otp: await hashPassword(otp),
    attempts: 0,
    sentAt: Date.now(),
    token: await hashPassword(token),
  })

  return sendEmailTemplate(
    'otp',
    'en',
    {
      otp,
      magicLink: `${useRuntimeConfig().public.url}/signin?email=${encodeURIComponent(email)}&token=${token}`,
    },
    email,
  )
})

function generateOTP(length = 6): string {
  const otp = crypto.randomInt(Math.pow(10, length - 1), Math.pow(10, length))
  return otp.toString()
}
