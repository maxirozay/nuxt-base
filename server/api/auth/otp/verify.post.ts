import { z } from 'zod'
import { OTP } from './get.post'
import { createUser } from '~~/server/utils/auth'

const bodySchema = z.object({
  email: z.email(),
  otp: z.string().length(6).or(z.string().min(32)),
})

export default defineEventHandler(async (event) => {
  const { email, otp } = await readValidatedBody(event, bodySchema.parse)
  if (!email || !otp) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and OTP are required',
    })
  }
  await verifyOTP(email, otp)
  const user = await getUser(email).catch((error: any) => {
    if (error.message === 'User not found') {
      return createUser({ email })
    } else throw error
  })
  if (user.totp) {
    throw createError({
      status: 401,
      message: 'TOTP required',
    })
  }
  await setSession(event, user)
})

export async function verifyOTP(email: string, otp: string): Promise<void> {
  const storage = useStorage('auth')
  const record = await storage.getItem<OTP>(email)
  if (!record) {
    throw createError({ statusCode: 400, message: 'Request a new OTP.' })
  }
  if (Date.now() > record.sentAt! + 5 * 60 * 1000 || record.attempts > 3) {
    await storage.removeItem(email)
    throw createError({ statusCode: 400, message: 'Request a new OTP.' })
  }

  if (await verifyPassword(otp.length > 6 ? record.token : record.otp, otp)) {
    await storage.removeItem(email)
  } else {
    record.attempts++
    await storage.setItem(email, record)
    throw createError({ statusCode: 400, message: 'Invalid OTP.' })
  }
}
