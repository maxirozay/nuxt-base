import { z } from 'zod'
import { getAuth } from '~~/server/utils/auth'

const bodySchema = z.object({
  email: z.email(),
})

export default defineEventHandler(async (event) => {
  const { email } = await readValidatedBody(event, bodySchema.parse)

  try {
    const user = await getAuth(email, true)
    return {
      hasOTP: true,
      hasPassword: !!user.password,
      hasTOTP: !!user.totp,
      hasPasskey: user.credentials!.length > 0,
    }
  } catch {
    return {
      hasOTP: true,
      hasPassword: false,
      hasTOTP: false,
      hasPasskey: false,
    }
  }
})
