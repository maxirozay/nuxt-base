import { z } from 'zod'

const bodySchema = z.object({
  email: emailSchema,
})

export default defineEventHandler(async (event) => {
  const { email } = await readValidatedBody(event, bodySchema.parse)

  const config = useRuntimeConfig()
  try {
    const user = await getAuth(event, email, true)
    return {
      hasOTP: true,
      hasPassword: !config.forceMfa && !!user.password,
      hasTOTP: !!user.totp,
      hasPasskey: user.credentials!.length > 0,
      forceMfa: config.forceMfa,
    }
  } catch {
    return {
      hasOTP: true,
      hasPassword: false,
      hasTOTP: false,
      hasPasskey: false,
      forceMfa: config.forceMfa,
    }
  }
})
